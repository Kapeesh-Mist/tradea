from fastapi import APIRouter, Depends, HTTPException
from app.routes.depend import get_current_user
from app.db.database import get_connection

router = APIRouter()

@router.get("/messages/inbox")
def get_inbox(current_user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Fetch all chats involving the user
        cur.execute("""
            SELECT 
                c.id AS chat_id,
                u.username,
                u.avatar_url,
                tr.status,
                tr.initial_message,
                tr.id AS request_id,
                p.id AS post_id,
                p.caption AS post_title
            FROM chats c
            JOIN trade_requests tr ON tr.id = c.request_id
            JOIN posts p ON p.id = c.post_id
            JOIN users u ON u.id = CASE 
                WHEN c.buyer_id = %s THEN c.seller_id 
                ELSE c.buyer_id 
            END
            WHERE c.buyer_id = %s OR c.seller_id = %s
        """, (current_user, current_user, current_user))

        chat_requests = []
        ongoing_trades = []
        past_trades = []

        for row in cur.fetchall():
            chat_id, username, avatar_url, status, last_message, request_id, post_id, post_title = row
            chat = {
                "chat_id": chat_id,
                "username": username,
                "avatar_url": avatar_url,
                "last_message": last_message,
                "status": status,
                "request_id": request_id,
                "post_id": post_id,
                "post_title": post_title
            }

            if status in ["requested", "pending"]:
                chat_requests.append(chat)
            elif status in ["accepted", "in_progress"]:
                ongoing_trades.append(chat)
            elif status in ["completed", "declined"]:
                past_trades.append(chat)

        return {
            "chat_requests": chat_requests,
            "ongoing_trades": ongoing_trades,
            "past_trades": past_trades
        }

    except Exception as e:
        print("Inbox fetch error:", e)
        raise HTTPException(status_code=500, detail="Failed to load inbox")

    finally:
        cur.close()
        conn.close()