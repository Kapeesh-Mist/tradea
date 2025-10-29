from fastapi import APIRouter, Form, Depends, HTTPException
from app.db.database import get_connection
import joblib
from fastapi.responses import JSONResponse
from app.routes.depend import get_current_user
from typing import List, Dict, Any
import os
import joblib
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "../ml/trust_model.pkl")
model = joblib.load(model_path)

router = APIRouter()

@router.get("/user/{user_id}/score")
def get_user_score(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # Total trades
    cur.execute("SELECT COUNT(*) FROM trades WHERE buyer_id = %s OR seller_id = %s", (user_id, user_id))
    total_trades = cur.fetchone()[0] or 0

    # Completed trades
    cur.execute("SELECT COUNT(*) FROM trades WHERE trade_completed = TRUE AND (buyer_id = %s OR seller_id = %s)", (user_id, user_id))
    completed = cur.fetchone()[0]

    # Deliveries
    cur.execute("SELECT COUNT(*) FROM trades WHERE seller_id = %s AND seller_delivered = TRUE", (user_id,))
    deliveries = cur.fetchone()[0]

    # Terms edits (mocked for now)
    cur.execute("SELECT COUNT(*) FROM trades WHERE (buyer_demand IS NOT NULL OR seller_demand IS NOT NULL) AND (buyer_id = %s OR seller_id = %s)", (user_id, user_id))
    edits = cur.fetchone()[0]

    cur.close()
    conn.close()

    # Prepare input for ML model
    confirmed = completed  # if you don't have a separate confirmed metric
    features = [[total_trades, completed, deliveries, confirmed, edits]]
    # Predict trust score using trained model
    try:
        predicted_score = round(model.predict(features)[0])
    except Exception as e:
        print("Model prediction error:", e)
        predicted_score = 50  # fallback score

    # Assign trust level
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

@router.get("/user/{user_id}/feed")
def get_user_feed(user_id: int, current_user: int = Depends(get_current_user)) -> Dict[str, List[Dict[str, Any]]]:
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only access your own feed.")

    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Fetch user tags with weights
    cur.execute("SELECT tag, weight FROM user_tags WHERE user_id = %s", (user_id,))
    tag_weights = {row[0]: row[1] for row in cur.fetchall()}

    # Step 2: Fetch active posts not uploaded by this user
    cur.execute("""
        SELECT p.id, p.caption, p.tags, p.user_id, p.likes_count, p.file_url, u.trust_score
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id != %s AND p.status = 'active'
    """, (user_id,))
    posts = cur.fetchall()

    feed = []

    for post in posts:
        post_id, caption, tags, owner_id, likes_count, file_url, trust_score = post

        # Parse tags safely
        if isinstance(tags, str):
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        elif isinstance(tags, list):
            tag_list = tags
        else:
            tag_list = []

        # Tag overlap score using weights
        overlap_score = sum(tag_weights.get(tag, 0) for tag in tag_list)

        # Final feed score
        score = overlap_score + trust_score * 0.5 + likes_count * 0.2

        feed.append({
            "post_id": post_id,
            "title": caption,
            "score": round(score),
            "owner_id": owner_id,
            "trust_score": trust_score,
            "tag_overlap_score": overlap_score,
            "likes_count": likes_count,
            "tags": tag_list,
            "file_url": file_url
        })

    return { "feed": feed }

@router.get("/user/{user_id}")
def get_user_profile(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # Fetch only existing columns
    cur.execute("""
        SELECT id, username, email, trust_score
        FROM users WHERE id = %s
    """, (user_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"error": "User not found"}

    uid, username, email, trust_score = result

    # Fetch user tags
    cur.execute("SELECT tag FROM user_tags WHERE user_id = %s", (uid,))
    tags = [row[0] for row in cur.fetchall()]

    # Fetch trade stats
    cur.execute("SELECT COUNT(*) FROM trades WHERE buyer_id = %s OR seller_id = %s", (uid, uid))
    total_trades = cur.fetchone()[0] or 0

    cur.execute("""
        SELECT COUNT(*) FROM trades
        WHERE trade_completed = TRUE AND (buyer_id = %s OR seller_id = %s)
    """, (uid, uid))
    completed_trades = cur.fetchone()[0] or 0

    cur.close()
    conn.close()

    return {
        "user_id": uid,
        "username": username,
        "email": email,
        "trust_score": trust_score,
        "tags": tags,
        "trade_stats": {
            "total": total_trades,
            "completed": completed_trades
        }
    }

@router.post("/user/{user_id}/like-tags")
def like_tags(user_id: int, tags: list[str] = Form(...)):
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

    return {
        "user_id": user_id,
        "liked_tags": tags
    }

@router.get("/me")
def get_me(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, username, email, trust_score
        FROM users WHERE id = %s
    """, (user_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    uid, username, email, trust_score = result

    cur.execute("SELECT tag FROM user_tags WHERE user_id = %s", (uid,))
    tags = [row[0] for row in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        "status": "success",
        "user_id": uid,
        "username": username,
        "email": email,
        "trust_score": trust_score,
        "tags": tags,
        "message": "Authenticated user profile"
    }

@router.get("/user/{user_id}/trade-requests")
def get_trade_requests(user_id: int, current_user: int = Depends(get_current_user)):
    if user_id != current_user:
        return JSONResponse(content={"error": "Unauthorized"}, status_code=403)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT tr.id, tr.message, tr.created_at, tr.buyer_id, tr.product_id, p.title
        FROM trade_requests tr
        JOIN products p ON tr.product_id = p.id
        WHERE p.owner_id = %s
        ORDER BY tr.created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    requests = [
        {
            "trade_id": row[0],
            "preview": row[1],
            "timestamp": row[2],
            "sender_id": row[3],
            "post_id": row[4],
            "post_title": row[5]
        }
        for row in rows
    ]

    return {"requests": requests}