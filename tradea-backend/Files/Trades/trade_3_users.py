from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.db.database import get_connection
from app.routes.depend import get_current_user
import os, joblib,json

router = APIRouter()

# Load ML model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "../ml/trust_model.pkl")
model = joblib.load(model_path)

# ✅ GET /me — Authenticated user profile
@router.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, username, trust_score, avatar_url, bio
        FROM users WHERE id = %s
    """, (user_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    uid, username, score, avatar_url, bio = result
    return {
        "user_id": uid,
        "username": username,
        "score": score,
        "avatar_url": avatar_url,
        "bio": bio
    }

# ✅ PATCH /user/{user_id} — Edit profile
@router.patch("/user/{user_id}")
def update_profile(
    user_id: int,
    username: str = Form(...),
    bio: str = Form(...),
    avatar: UploadFile = File(None),
    current_user: int = Depends(get_current_user)
):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_connection()
    cur = conn.cursor()

    avatar_url = None
    if avatar:
        try:
            # ✅ Ensure directory exists
            avatar_dir = "static/avatars"
            os.makedirs(avatar_dir, exist_ok=True)

            # ✅ Save file to disk
            avatar_filename = f"{user_id}_{avatar.filename}"
            avatar_path = os.path.join(avatar_dir, avatar_filename)
            with open(avatar_path, "wb") as f:
                f.write(avatar.file.read())

            # ✅ Construct browser-safe URL
            avatar_url = f"/static/avatars/{avatar_filename}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Avatar upload failed: {str(e)}")

    try:
        # ✅ Update user profile
        cur.execute("""
            UPDATE users
            SET username = %s, bio = %s, avatar_url = COALESCE(%s, avatar_url)
            WHERE id = %s
        """, (username, bio, avatar_url, user_id))
        conn.commit()

        # ✅ Fetch updated profile
        cur.execute("""
            SELECT username, bio, avatar_url, trust_score
            FROM users WHERE id = %s
        """, (user_id,))
        updated = cur.fetchone()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "username": updated[0],
        "bio": updated[1],
        "avatar_url": updated[2],
        "score": updated[3]
    }

# ✅ GET /user/{user_id}/score — ML trust score
@router.get("/user/{user_id}/score")
def get_user_score(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM trades WHERE buyer_id = %s OR seller_id = %s", (user_id, user_id))
    total_trades = cur.fetchone()[0] or 0

    cur.execute("SELECT COUNT(*) FROM trades WHERE trade_completed = TRUE AND (buyer_id = %s OR seller_id = %s)", (user_id, user_id))
    completed = cur.fetchone()[0] or 0

    cur.execute("SELECT COUNT(*) FROM trades WHERE seller_id = %s AND seller_delivered = TRUE", (user_id,))
    deliveries = cur.fetchone()[0] or 0

    cur.execute("SELECT COUNT(*) FROM trades WHERE (buyer_demand IS NOT NULL OR seller_demand IS NOT NULL) AND (buyer_id = %s OR seller_id = %s)", (user_id, user_id))
    edits = cur.fetchone()[0] or 0

    cur.close()
    conn.close()

    features = [[total_trades, completed, deliveries, completed, edits]]
    try:
        predicted_score = round(model.predict(features)[0])
    except Exception:
        predicted_score = 50

    level = (
        "Trusted" if predicted_score >= 90 else
        "Reliable" if predicted_score >= 70 else
        "Caution" if predicted_score >= 50 else
        "Risky"
    )

    return {
        "user_id": user_id,
        "score": predicted_score,
        "level": level,
        "metrics": {
            "total_trades": total_trades,
            "completed": completed,
            "deliveries": deliveries,
            "edited_terms": edits
        }
    }

# ✅ GET /user/{user_id}/posts — User's post's
@router.get("/user/{user_id}/posts")
def get_user_posts(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # ✅ Fetch posts for the user
    cur.execute("""
        SELECT id, caption, tags, file_url, created_at, status, likes_count
        FROM posts
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    # ✅ Format response
    posts = []
    for row in rows:
        post_id, caption, tags_raw, file_url, created_at, status, likes_count = row

        # ✅ Parse tags safely
        try:
            tags = json.loads(tags_raw) if tags_raw else []
            if not isinstance(tags, list):
                tags = []
        except:
            tags = []

        posts.append({
            "post_id": post_id,
            "caption": caption,
            "tags": tags,
            "file_url": file_url,
            "created_at": created_at.isoformat(),  # ✅ Fix: convert datetime to string
            "status": status,
            "likes_count": likes_count
        })

    return JSONResponse(content={
        "user_id": user_id,
        "posts": posts
    })

# ✅ POST /user/{user_id}/like-tags — Tag preferences
@router.post("/user/{user_id}/like-tags")
def like_tags(user_id: int, tags: list[str] = Form(...), current_user: int = Depends(get_current_user)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_connection()
    cur = conn.cursor()

    for tag in tags:
        cur.execute("""
            INSERT INTO user_tags (user_id, tag, weight)
            VALUES (%s, %s, 3)
            ON CONFLICT (user_id, tag)
            DO UPDATE SET weight = user_tags.weight + 3
        """, (user_id, tag))

    conn.commit()
    cur.close()
    conn.close()

    return {"user_id": user_id, "liked_tags": tags}

# ✅ GET /user/{user_id}/trade-requests — Incoming requests
@router.get("/user/{user_id}/trade-requests")
def get_trade_requests(user_id: int, current_user: int = Depends(get_current_user)):
    if user_id != current_user:
        return JSONResponse(content={"error": "Unauthorized"}, status_code=403)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT tr.id, tr.message, tr.created_at, tr.buyer_id, tr.post_id, tr.status, p.caption
        FROM trade_requests tr
        JOIN posts p ON tr.post_id = p.id
        WHERE p.user_id = %s
        ORDER BY tr.created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    requests = [{
        "id": r[0],
        "message": r[1],
        "timestamp": r[2],
        "buyer_id": r[3],
        "post_id": r[4],
        "status": r[5],
        "post_title": r[6]
    } for r in rows]

    return {"requests": requests}

# ✅ GET /user/{user_id}/feed — Personalized feed
@router.get("/user/{user_id}/feed")
def get_dev_feed(
    user_id: int,
    limit: int = 30,
    offset: int = 0,
    current_user: int = Depends(get_current_user)
):
    # ✅ Auth check
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Unauthorized")

    conn = get_connection()
    cur = conn.cursor()

    # ✅ Fetch recent posts with user info — exclude current user's own posts
    cur.execute("""
        SELECT p.id, p.caption, p.tags, p.file_url, p.created_at, p.status, p.likes_count,
               u.id AS poster_id, u.username, u.avatar_url, u.trust_score
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id != %s
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
    """, (current_user, limit, offset))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    feed = []
    for row in rows:
        post_id, caption, tags_raw, file_url, created_at, status, likes_count, poster_id, username, avatar_url, trust_score = row

        try:
            tags = json.loads(tags_raw) if tags_raw else []
            if not isinstance(tags, list):
                tags = []
        except:
            tags = []

        feed.append({
            "post_id": post_id,
            "caption": caption,
            "tags": tags,
            "file_url": file_url,
            "created_at": created_at.isoformat(),
            "status": status,
            "likes_count": likes_count,
            "user": {
                "user_id": poster_id,
                "username": username,
                "avatar_url": avatar_url,
                "trust_score": trust_score
            }
        })

    # ✅ Fallback message if feed is empty
    if not feed:
        return JSONResponse(content={
            "feed": [],
            "message": "No products available from other users."
        })

    return JSONResponse(content={"feed": feed})