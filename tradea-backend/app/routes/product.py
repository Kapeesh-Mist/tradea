from fastapi import APIRouter, Form
from typing import List
from app.db.database import get_connection 
import os
from fastapi.responses import FileResponse
from fastapi import UploadFile, File
from fastapi.responses import JSONResponse
import shutil
from app.routes.depend import get_current_user
product_router = APIRouter()
post_router = APIRouter()

@product_router.post("/product/upload")
def upload_product(
    owner_id: int = Form(...),
    trade_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(None),
    link: str = Form(None)
):
    conn = get_connection()
    cur = conn.cursor()

    # Validate trade exists
    cur.execute("SELECT id FROM trades WHERE id = %s", (trade_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {"error": "Trade not found"}

    # Decide file_url
    if file and file.filename:
        file_path = f"Files/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = file_path
    elif link:
        file_url = link
    else:
        cur.close()
        conn.close()
        return {"error": "No file or link provided"}

    # Insert product
    cur.execute("""
        INSERT INTO products (owner_id, title, description, file_url, trade_id)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (owner_id, title, description, file_url, trade_id))
    product_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return JSONResponse(content={
        "message": "Product uploaded successfully",
        "product_id": product_id,
        "file_url": file_url
    })


@product_router.get("/user/{user_id}/posts")
def get_user_posts(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, description, file_url,tags, created_at
        FROM products
        WHERE owner_id = %s
        ORDER BY created_at DESC
    """, (user_id,))

    posts = cur.fetchall()
    cur.close()
    conn.close()

    return {"posts": posts}

@product_router.post("/product/{product_id}/trade-request")
def create_trade_request(
    product_id: int,
    buyer_id: int = Form(...),
    message: str = Form(...)
):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO trade_requests (product_id, buyer_id, message)
        VALUES (%s, %s, %s)
    """, (product_id, buyer_id, message))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade request sent"}

@product_router.get("/product/{product_id}/download")
def download_product(product_id: int, user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Get trade_id from product
    cur.execute("SELECT trade_id FROM products WHERE id = %s", (product_id,))
    trade_row = cur.fetchone()

    if not trade_row or not trade_row[0]:
        cur.close()
        conn.close()
        return {"error": "No trade linked to this product"}

    trade_id = trade_row[0]

    # Step 2: Check trade status
    cur.execute("""
        SELECT buyer_id, seller_delivered, trade_completed
        FROM trades
        WHERE id = %s
    """, (trade_id,))
    trade = cur.fetchone()

    if not trade:
        cur.close()
        conn.close()
        return {"error": "Trade not found"}

    buyer_id, seller_delivered, trade_completed = trade

    if buyer_id != user_id:
        cur.close()
        conn.close()
        return {"error": "User is not the buyer in this trade"}

    if not seller_delivered:
        cur.close()
        conn.close()
        return {"error": "Seller has not delivered the product yet"}

    if not trade_completed:
        cur.close()
        conn.close()
        return {"error": "Trade not marked as completed by buyer"}

    # Step 3: Fetch product file path
    cur.execute("SELECT file_url FROM products WHERE id = %s", (product_id,))
    file = cur.fetchone()

    cur.close()
    conn.close()

    if not file:
        return {"error": "Product file not found"}

      # Or use file[0] if it's a full path
    file_path = file[0]

    if file_path.startswith("http"):
        return {"message": "Access granted", "link": file_path}

    if not os.path.exists(file_path):
        return {"error": "File not found on server"}

    return FileResponse(
        path=file_path,
        filename=f"product_{product_id}.txt",
        media_type="application/octet-stream"
    )
