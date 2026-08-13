from fastapi import APIRouter,Depends, Form, UploadFile, File, Query,HTTPException
from fastapi.responses import JSONResponse
import shutil,os,uuid
from pydantic import BaseModel
from app.db.database import get_connection
from app.routes.depend import get_current_user
import base64
import json
post_router = APIRouter()



class TradeRequest(BaseModel):
    buyer_id: int
    message: str

def encrypt_payload(payload: dict) -> str:
    json_str = json.dumps(payload)
    encoded = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
    return encoded
def decrypt_payload(encoded: str) -> dict:
    decoded = base64.b64decode(encoded.encode("utf-8")).decode("utf-8")
    return json.loads(decoded)

@post_router.post("/post/upload")
def upload_post(
    caption: str = Form(...),
    tags_raw: str = Form(...),
    file: UploadFile = File(None),
    link: str = Form(None),
    user_id: int = Depends(get_current_user)
):
    print("User ID:", user_id)
    print("Caption:", caption)
    print("File:", file.filename if file else "No file")

    # ✅ Parse tags
    tags = [tag.strip().lower() for tag in tags_raw.split(",") if tag.strip()]
    tags_json = json.dumps(tags)

    # ✅ Handle file or link
    file_url = None
    if file and file.filename:
        allowed_types = ["image/jpeg", "image/png", "video/mp4"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        os.makedirs("Files/posts", exist_ok=True)
        safe_filename = f"{user_id}_{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join("Files", "posts", safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_url = f"/Files/posts/{safe_filename}"
    elif link:
        file_url = link
    else:
        return JSONResponse(content={"error": "No file or link provided"}, status_code=400)

    # ✅ Insert into DB
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO posts (user_id, caption, tags, file_url, likes_count)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (user_id, caption, tags_json, file_url, 0))
    post_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return JSONResponse(content={
        "message": "Post uploaded successfully",
        "post_id": post_id,
        "caption": caption,
        "file_url": file_url,
        "tags": tags
    })

@post_router.get("/post/{post_id}")
def get_post(post_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, user_id, caption, tags, file_url, created_at, status, likes_count
        FROM posts
        WHERE id = %s
    """, (post_id,))
    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        return {"error": "Post not found"}

    post = {
        "post_id": result[0],
        "user_id": result[1],
        "caption": result[2],
        "tags": result[3] if result[3] else [],
        "file_url": result[4],
        "created_at": result[5],
        "status": result[6],
        "likes_count": result[7]
    }

    return {"post": post}

@post_router.get("/posts/discover")
def discover_posts(
    search: str = Query(""),  # Free text search
    min_trust: int = Query(30),  # Default trust score
    sort_by: str = Query("created_at")  # Options: "created_at", "trust_score"
):
    conn = get_connection()
    cur = conn.cursor()

    # ✅ Fetch all active posts with user trust score
    query = """
        SELECT p.id, p.user_id, p.caption, p.tags, p.file_url, p.created_at, u.trust_score, p.likes_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'active' AND u.trust_score >= %s
    """
    query += " ORDER BY u.trust_score DESC" if sort_by == "trust_score" else " ORDER BY p.created_at DESC"

    cur.execute(query, (min_trust,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    search_lower = search.strip().lower()
    posts = []

    for row in rows:
        post_id, user_id, caption, tags_raw, file_url, created_at, trust_score, likes_count = row

        try:
            tags = json.loads(tags_raw) if tags_raw else []
            if not isinstance(tags, list):
                tags = []
        except:
            tags = []

        # ✅ Match if any tag contains the search term as substring
        if search_lower and len(search_lower) >= 3:
            match_found = any(search_lower in tag.lower() for tag in tags)
            if not match_found:
                continue  # Skip if no tag matches
        # If no search term or it's too short, show all

        posts.append({
            "post_id": post_id,
            "user_id": user_id,
            "caption": caption,
            "tags": tags,
            "file_url": file_url,
            "created_at": created_at.isoformat(),
            "trust_score": trust_score,
            "likes_count": likes_count
        })

    return JSONResponse(content={"posts": posts})

@post_router.post("/post/{post_id}/initiate-trade")
def initiate_trade_from_post(
    post_id: int,
    buyer_id: int = Form(...),
    price: int = Form(...),
    buyer_demand: str = Form(None),
    seller_demand: str = Form(None)
):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Fetch post
    cur.execute("""
        SELECT user_id, caption, file_url
        FROM posts
        WHERE id = %s AND status = 'active'
    """, (post_id,))
    post = cur.fetchone()

    if not post:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Post not found or inactive"}

    seller_id, caption, file_url = post

    # Step 2: Create product from post
    cur.execute("""
        INSERT INTO products (owner_id, title, description, file_url)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (seller_id, caption, caption, file_url))
    product_id = cur.fetchone()[0]

    # Step 3: Create trade
    cur.execute("""
        INSERT INTO trades (
            buyer_id, seller_id, item, price,
            buyer_demand, seller_demand,
            seller_product_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        buyer_id, seller_id, caption, price,
        buyer_demand, seller_demand,
        product_id
    ))
    trade_id = cur.fetchone()[0]

    # Step 4: Link product to trade
    cur.execute("UPDATE products SET trade_id = %s WHERE id = %s", (trade_id, product_id))

    # Step 5: Mark post as converted
    cur.execute("UPDATE posts SET status = 'converted' WHERE id = %s", (post_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Trade initiated from post",
        "trade_id": trade_id,
        "product_id": product_id
    }

@post_router.post("/post/{post_id}/trade-request")
def create_trade_request(post_id: int, request: TradeRequest):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Step 1: Validate post exists and is active
        cur.execute("SELECT user_id FROM posts WHERE id = %s AND status = 'active'", (post_id,))
        post = cur.fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found or inactive")

        seller_id = post[0]

        # Step 2: Insert trade request
        cur.execute("""
            INSERT INTO trade_requests (post_id, buyer_id, owner_id, initial_message, status)
            VALUES (%s, %s, %s, %s, 'requested')
            RETURNING id
        """, (post_id, request.buyer_id, seller_id, request.message))
        request_id = cur.fetchone()[0]

        # Step 3: Create chat thread
        cur.execute("""
            INSERT INTO chats (buyer_id, seller_id, post_id, request_id, status)
            VALUES (%s, %s, %s, %s, 'requested')
            RETURNING id
        """, (request.buyer_id, seller_id, post_id, request_id))
        chat_id = cur.fetchone()[0]

        conn.commit()
        cur.execute("SELECT username, avatar_url FROM users WHERE id = %s", (seller_id,))
        user = cur.fetchone()
        username, avatar_url = user

        return {
            "message": "Trade request created",
            "chat": {
                "chat_id": chat_id,
                "request_id": request_id,
                "status": "requested",
                "username": username,
                "avatar_url": avatar_url,
                "initial_message": request.message
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create trade request: {str(e)}")

    finally:
        cur.close()
        conn.close()


@post_router.post("/trade-request/{request_id}/accept")
def accept_trade_request(request_id: int, current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE trade_requests
        SET status = 'accepted'
        WHERE id = %s
    """, (request_id,))
    cur.execute("""
        UPDATE chats
        SET status = 'active'
        WHERE request_id = %s
    """, (request_id,))


    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade request accepted"}

@post_router.post("/trade-request/{request_id}/decline")
def decline_trade_request(request_id: int, current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE trade_requests
        SET status = 'declined'
        WHERE id = %s
    """, (request_id,))
    cur.execute("""
        UPDATE chats
        SET status = 'closed'
        WHERE request_id = %s
    """, (request_id,))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade request declined"}

@post_router.get("/trade-request/{request_id}")
def get_trade_request(request_id: int, current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT tr.id, tr.status, p.user_id AS owner_id
        FROM trade_requests tr
        JOIN posts p ON p.id = tr.post_id
        WHERE tr.id = %s
    """, (request_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Trade request not found")

    return {
        "request_id": row[0],
        "status": row[1],
        "owner_id": row[2]
    }
