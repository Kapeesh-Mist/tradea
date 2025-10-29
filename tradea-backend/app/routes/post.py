from fastapi import APIRouter,Depends, Form, UploadFile, File, Query,HTTPException
from fastapi.responses import JSONResponse
import shutil
from pydantic import BaseModel
from app.db.database import get_connection
from app.routes.depend import get_current_user
import shutil
post_router = APIRouter()

import base64
import json

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
    user_id: int = Depends(get_current_user)  # ✅ Expect int directly
):
    print("User ID:", user_id)
    print("Caption:", caption)
    print("File:", file.filename if file else "No file")

    # Parse tags
    tags = [tag.strip().lower() for tag in tags_raw.split(",") if tag.strip()]

    # Handle file or link
    if file and file.filename:
        file_path = f"Files/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = file_path
    elif link:
        file_url = link
    else:
        return JSONResponse(content={"error": "No file or link provided"}, status_code=400)

    # Insert into posts table
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO posts (user_id, caption, tags, file_url, likes_count)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (user_id, caption, tags, file_url, 0))
    post_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return JSONResponse(content={
        "message": "Post uploaded successfully",
        "post_id": post_id,
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

@post_router.get("/user/{user_id}/posts")
def get_user_posts(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, caption, tags, file_url, created_at, status, likes_count
        FROM posts
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    posts = []
    for row in rows:
        posts.append({
            "post_id": row[0],
            "caption": row[1],
            "tags": row[2] if row[2] else [],
            "file_url": row[3],
            "created_at": row[4],
            "status": row[5],
            "likes_count": row[6]
        })

    return {"user_id": user_id, "posts": posts}

@post_router.get("/posts/discover")
def discover_posts(
    tag: str = Query(None),
    min_trust: int = Query(None),
    sort_by: str = Query("created_at")  # Options: "created_at", "trust_score"
):
    conn = get_connection()
    cur = conn.cursor()

    # Base query
    query = """
        SELECT p.id, p.user_id, p.caption, p.tags, p.file_url, p.created_at, u.trust_score, p.likes_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'active'
    """
    params = []

    # Filter by tag (match any tag in array)
    if tag:
        query += " AND %s = ANY(p.tags)"
        params.append(tag.lower())

    # Filter by trust score
    if min_trust is not None:
        query += " AND u.trust_score >= %s"
        params.append(min_trust)

    # Sorting
    if sort_by == "trust_score":
        query += " ORDER BY u.trust_score DESC"
    else:
        query += " ORDER BY p.created_at DESC"

    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    posts = []
    for row in rows:
        posts.append({
            "post_id": row[0],
            "user_id": row[1],
            "caption": row[2],
            "tags": row[3] if row[3] else [],
            "file_url": row[4],
            "created_at": row[5],
            "trust_score": row[6],
            "likes_count": row[7]
        })

    return {"posts": posts}

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

@post_router.post("/post/{product_id}/trade-request")
def create_trade_request(post_id: int, request: TradeRequest):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Validate post exists and is active
        cur.execute("SELECT id FROM posts WHERE id = %s AND status = 'active'", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found or inactive")

        # Insert trade request using post_id
        cur.execute("""
            INSERT INTO trade_requests (post_id, buyer_id, message, status)
            VALUES (%s, %s, %s, 'pending')
        """, (post_id, request.buyer_id, request.message))

        conn.commit()
        return {"message": "Trade request sent"}

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

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade request declined"}
