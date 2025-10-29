from fastapi import APIRouter, Form
from app.db.database import get_connection
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import json
import os
from app.routes.depend import get_current_user

router = APIRouter()

def encrypt_payload(data: dict) -> str:
    key = os.getenv("ENCRYPTION_KEY").encode()
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CFB, iv)
    encrypted = cipher.encrypt(json.dumps(data).encode())
    return base64.b64encode(iv + encrypted).decode()

def decrypt_payload(encrypted_str: str) -> dict:
    key = os.getenv("ENCRYPTION_KEY").encode()
    raw = base64.b64decode(encrypted_str)
    iv = raw[:16]
    encrypted = raw[16:]
    cipher = AES.new(key, AES.MODE_CFB, iv)
    decrypted = cipher.decrypt(encrypted)
    return json.loads(decrypted.decode())
    
@router.post("/trade/initiate")
def initiate_trade(
    buyer_id: int = Form(...),
    seller_id: int = Form(...),
    item: str = Form(...),
    price: int = Form(...),
    buyer_demand: str = Form(None),
    seller_demand: str = Form(None)
):
    try:
        payload = {
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "item": item,
            "price": price,
            "buyer_demand": buyer_demand,
            "seller_demand": seller_demand
        }
        encrypted = encrypt_payload(payload)

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO trades (buyer_id, seller_id, item, price, encrypted_payload, buyer_demand, seller_demand)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (buyer_id, seller_id, item, price, encrypted, buyer_demand, seller_demand))
        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Trade initiated", "encrypted": encrypted}
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.post("/trade/confirm")
def confirm_trade(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Get trade details
    cur.execute("SELECT buyer_id, seller_id, buyer_confirmed, seller_confirmed FROM trades WHERE id = %s", (trade_id,))
    trade = cur.fetchone()

    if not trade:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, buyer_confirmed, seller_confirmed = trade

    # Update confirmation
    if user_id == buyer_id and not buyer_confirmed:
        cur.execute("UPDATE trades SET buyer_confirmed = TRUE WHERE id = %s", (trade_id,))
    elif user_id == seller_id and not seller_confirmed:
        cur.execute("UPDATE trades SET seller_confirmed = TRUE WHERE id = %s", (trade_id,))
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Invalid user or already confirmed"}

    conn.commit()

    # Check if both confirmed
    cur.execute("SELECT buyer_confirmed, seller_confirmed FROM trades WHERE id = %s", (trade_id,))
    confirmed = cur.fetchone()
    cur.close()
    conn.close()

    if confirmed == (True, True):
        return {"message": "Trade fully confirmed"}
    else:
        return {"message": "Confirmation recorded, waiting for other party"}

@router.get("/trade/view")
def view_trade(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT encrypted_payload FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        return {"status": "error", "details": "Trade not found"}

    encrypted_payload = result[0]
    decrypted = decrypt_payload(encrypted_payload)
    return {"trade_id": trade_id, "details": decrypted}

@router.post("/trade/terms/generate")
def generate_terms(trade_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT buyer_id, seller_id, buyer_demand, seller_demand, item
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, buyer_demand, seller_demand, item = result

    terms = f"""
    Trade Agreement:
    - Buyer (User {buyer_id}) agrees to: {buyer_demand}
    - Seller (User {seller_id}) agrees to: {seller_demand}
    - Item: {item}
    - Ownership transfers upon delivery.
    - Copyright remains with seller unless stated.
    - No refunds unless mutually agreed.
    - Platform is not a legal party to this agreement.
    """

    cur.execute("UPDATE trades SET terms_text = %s WHERE id = %s", (terms, trade_id))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Terms generated", "terms": terms}

@router.post("/trade/terms/edit")
def edit_terms(trade_id: int = Form(...), user_id: int = Form(...), edited_terms: str = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Confirm user is part of the trade
    cur.execute("SELECT buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id = result
    if user_id not in [buyer_id, seller_id]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "User not part of this trade"}

    # Update terms and reset acceptance
    cur.execute("""
        UPDATE trades
        SET terms_text = %s,
            buyer_accepted_terms = FALSE,
            seller_accepted_terms = FALSE
        WHERE id = %s
    """, (edited_terms, trade_id))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Terms updated. Both users must re-accept."}

@router.post("/trade/terms/accept")
def accept_terms(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id = result

    if user_id == buyer_id:
        cur.execute("UPDATE trades SET buyer_accepted_terms = TRUE WHERE id = %s", (trade_id,))
    elif user_id == seller_id:
        cur.execute("UPDATE trades SET seller_accepted_terms = TRUE WHERE id = %s", (trade_id,))
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "User not part of this trade"}

    conn.commit()

    # Check if both accepted
    cur.execute("""
        SELECT buyer_accepted_terms, seller_accepted_terms
        FROM trades WHERE id = %s
    """, (trade_id,))
    accepted = cur.fetchone()
    cur.close()
    conn.close()

    if accepted[0] and accepted[1]:
        return {"message": "Both users accepted terms. Trade is ready for escrow."}
    else:
        return {"message": "Terms accepted. Waiting for other party."}


@router.post("/trade/escrow")
def lock_escrow(trade_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Check if trade exists and is fully confirmed
    cur.execute("""
        SELECT buyer_confirmed, seller_confirmed 
        FROM trades 
        WHERE id = %s
    """, (trade_id,))
    status = cur.fetchone()

    if not status:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_confirmed, seller_confirmed = status
    if not (buyer_confirmed and seller_confirmed):
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not fully confirmed"}

    # Step 2: Lock escrow and generate mock payment reference
    payment_ref = f"PAYTM-{trade_id}-{os.urandom(4).hex()}"
    cur.execute("""
        UPDATE trades 
        SET escrow_locked = TRUE, payment_reference = %s 
        WHERE id = %s
    """, (payment_ref, trade_id))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Escrow locked",
        "payment_reference": payment_ref
    }

@router.post("/trade/deliver")
def deliver_product(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT seller_id FROM trades WHERE id = %s", (trade_id,))
    seller = cur.fetchone()

    if not seller or user_id != seller[0]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Unauthorized or trade not found"}

    cur.execute("UPDATE trades SET seller_delivered = TRUE WHERE id = %s", (trade_id,))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Product marked as delivered"}

@router.post("/trade/complete")
def complete_trade(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT buyer_id, seller_delivered FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_delivered = result
    if user_id != buyer_id:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Only buyer can confirm delivery"}

    if not seller_delivered:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Seller has not marked delivery yet"}

    cur.execute("""
        UPDATE trades 
        SET buyer_confirmed_delivery = TRUE,
            trade_completed = TRUE
        WHERE id = %s
    """, (trade_id,))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade completed. Agreement now downloadable."}

from fastapi.responses import PlainTextResponse
@router.get("/trade/terms/download")
def download_terms(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT terms_text, buyer_accepted_terms, seller_accepted_terms, trade_completed
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        return {"status": "error", "details": "Trade not found"}

    terms_text, buyer_accepted, seller_accepted, trade_completed = result

    if not (buyer_accepted and seller_accepted):
        return {"status": "error", "details": "Terms not accepted by both users"}

    if not trade_completed:
        return {"status": "error", "details": "Trade not completed yet"}

    return PlainTextResponse(content=terms_text, media_type="text/plain")

from fastapi import APIRouter, Form
from app.db.database import get_connection

@router.post("/trade/create")
def create_trade(
    buyer_id: int = Form(...),
    seller_id: int = Form(...),
    item: str = Form(...),
    price: int = Form(...),
    encrypted_payload: str = Form(...),
    buyer_demand: str = Form(None),
    seller_demand: str = Form(None),
    buyer_product_id: int = Form(None),
    seller_product_id: int = Form(None)
):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO trades (
                buyer_id, seller_id, item, price,
                encrypted_payload, buyer_demand, seller_demand, buyer_product_id, seller_product_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            buyer_id, seller_id, item, price,
            encrypted_payload, buyer_demand, seller_demand, buyer_product_id, seller_product_id
        ))

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Trade created"}
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.get("/trade/status")
def get_trade_status(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT buyer_confirmed, seller_confirmed,
               buyer_accepted_terms, seller_accepted_terms,
               escrow_locked, seller_delivered,
               buyer_confirmed_delivery, trade_completed
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        return {"status": "error", "details": "Trade not found"}

    keys = [
        "buyer_confirmed", "seller_confirmed",
        "buyer_accepted_terms", "seller_accepted_terms",
        "escrow_locked", "seller_delivered",
        "buyer_confirmed_delivery", "trade_completed"
    ]

    return {"trade_id": trade_id, "status": dict(zip(keys, result))}

@router.post("/trade/swap/confirm")
def confirm_swap(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Get buyer/seller IDs and current flags
    cur.execute("""
        SELECT buyer_id, seller_id,
               buyer_confirmed_delivery, seller_delivered
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, buyer_confirmed, seller_confirmed = result

    # Step 2: Update delivery flags based on user role
    if user_id == buyer_id and not buyer_confirmed:
        cur.execute("UPDATE trades SET buyer_confirmed_delivery = TRUE WHERE id = %s", (trade_id,))
    elif user_id == seller_id and not seller_confirmed:
        cur.execute("UPDATE trades SET seller_delivered = TRUE WHERE id = %s", (trade_id,))
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Invalid user or already confirmed"}

    conn.commit()

    # Step 3: Check if both sides have confirmed
    cur.execute("""
        SELECT buyer_confirmed_delivery, seller_delivered
        FROM trades WHERE id = %s
    """, (trade_id,))
    confirmed = cur.fetchone()

    if confirmed == (True, True):
        cur.execute("UPDATE trades SET trade_completed = TRUE WHERE id = %s", (trade_id,))
        conn.commit()
        message = "Trade swap complete. Both parties confirmed."
    else:
        message = "Confirmation recorded. Waiting for other party."

    cur.close()
    conn.close()

    return {"message": message}

@router.get("/user/{user_id}/trades")
def get_user_trades(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, item, price,
               buyer_id, seller_id,
               buyer_confirmed_delivery, seller_delivered,
               trade_completed,
               buyer_product_id, seller_product_id
        FROM trades
        WHERE buyer_id = %s OR seller_id = %s
        ORDER BY id DESC
    """, (user_id, user_id))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    trades = []
    for row in rows:
        trades.append({
            "trade_id": row[0],
            "item": row[1],
            "price": row[2],
            "buyer_id": row[3],
            "seller_id": row[4],
            "buyer_confirmed_delivery": row[5],
            "seller_delivered": row[6],
            "trade_completed": row[7],
            "buyer_product_id": row[8],
            "seller_product_id": row[9]
        })

    return {"user_id": user_id, "trades": trades}  

@router.patch("/trade/{trade_id}/cancel")
def cancel_trade(trade_id: int, user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Fetch trade details
    cur.execute("""
        SELECT buyer_id, seller_id, escrow_locked, trade_completed
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, escrow_locked, trade_completed = result

    # Step 2: Validate user and status
    if user_id not in [buyer_id, seller_id]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "User not part of this trade"}

    if escrow_locked:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Cannot cancel after escrow is locked"}

    if trade_completed:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade already completed"}

    # Step 3: Mark trade as cancelled
    cur.execute("""
        UPDATE trades SET trade_completed = FALSE, escrow_locked = FALSE,
                         buyer_confirmed = FALSE, seller_confirmed = FALSE,
                         buyer_accepted_terms = FALSE, seller_accepted_terms = FALSE,
                         seller_delivered = FALSE, buyer_confirmed_delivery = FALSE,
                         payment_reference = NULL,
                         terms_text = NULL
        WHERE id = %s
    """, (trade_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade cancelled successfully"}

