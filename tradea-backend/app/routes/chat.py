from fastapi import APIRouter, Depends, HTTPException
from app.routes.depend import get_current_user
from app.db.database import get_connection
from pydantic import BaseModel

router = APIRouter()

class ChatMessage(BaseModel):
    trade_request_id: int
    message: str

@router.post("/chat/send")
def send_message(data: ChatMessage, current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # ✅ Validate message content
        if not data.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # ✅ Fetch trade request and allow "requested" or "accepted"
        cur.execute("SELECT buyer_id, post_id, status FROM trade_requests WHERE id = %s", (data.trade_request_id,))
        trade = cur.fetchone()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade request not found")
        if trade[2] not in ["requested", "accepted"]:
            raise HTTPException(status_code=403, detail="Trade request not active")

        buyer_id, post_id, _ = trade

        # ✅ Get seller from post
        cur.execute("SELECT user_id FROM posts WHERE id = %s", (post_id,))
        seller_row = cur.fetchone()
        if not seller_row:
            raise HTTPException(status_code=404, detail="Post not found")
        seller_id = seller_row[0]

        # ✅ Verify sender is buyer or seller
        if current_user not in [buyer_id, seller_id]:
            raise HTTPException(status_code=403, detail="Unauthorized to send message")

        receiver_id = seller_id if current_user == buyer_id else buyer_id

        # ✅ Insert message
        cur.execute("""
            INSERT INTO chat (sender_id, receiver_id, message, trade_request_id)
            VALUES (%s, %s, %s, %s)
            RETURNING sender_id, receiver_id, message, timestamp
        """, (current_user, receiver_id, data.message, data.trade_request_id))

        row = cur.fetchone()
        conn.commit()

        return {
            "message": {
                "from": row[0],
                "to": row[1],
                "message": row[2],
                "timestamp": row[3].isoformat()
            }
        }

    except HTTPException as e:
        raise e  # ✅ Preserve original status codes
    except Exception as e:
        conn.rollback()
        print("Send message error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error while sending message")
    finally:
        cur.close()
        conn.close()

# GET: Fetch chat history
@router.get("/chat/{trade_request_id}")
def get_chat(trade_request_id: int, current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    # Verify trade is accepted and user is part of it
    cur.execute("SELECT buyer_id, post_id, status FROM trade_requests WHERE id = %s", (trade_request_id,))
    trade = cur.fetchone()
    if not trade or trade[2] not in ["requested", "accepted"]:
        raise HTTPException(status_code=403, detail="Chat not available")

    buyer_id, post_id, _ = trade
    cur.execute("SELECT user_id FROM posts WHERE id = %s", (post_id,))
    seller_row = cur.fetchone()
    if not seller_row:
        raise HTTPException(status_code=404, detail="Post not found")
    seller_id = seller_row[0]

    if current_user not in [buyer_id, seller_id]:
        raise HTTPException(status_code=403, detail="Unauthorized to view chat")

    # Fetch messages
    cur.execute("""
        SELECT sender_id, receiver_id, message, timestamp
        FROM chat
        WHERE trade_request_id = %s
        ORDER BY timestamp ASC
    """, (trade_request_id,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return {
        "chat": [
            {
                "from": row[0],
                "to": row[1],
                "message": row[2],
                "timestamp": row[3].isoformat()
            }
            for row in rows
        ]
    }