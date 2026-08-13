from fastapi import APIRouter, Form, UploadFile, File, HTTPException,Depends,Request
from fastapi.responses import JSONResponse
from typing import List
import shutil
from pathlib import Path
from app.db.database import get_connection
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import json
import os
from datetime import datetime,timedelta
from app.routes.depend import get_current_user
from app.utils.openai import generate_trade_terms,extract_demand_from_chat
from app.utils.gemini import extract_demand_from_chat_gemini, generate_trade_terms_gemini
from app.utils.deepseek import extract_demand_from_chat_deepseek, generate_trade_terms_deepseek

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

@router.post("/trade-intent")
def record_trade_intent(
    request_id: int = Form(...),
    user:int =Depends(get_current_user)
):
    user_id = user
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT buyer_id, owner_id FROM trade_requests WHERE id = %s", (request_id,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "details": "Trade request not found"}

        buyer_id, seller_id = row

        cur.execute("SELECT buyer_started, seller_started FROM trade_intents WHERE request_id = %s", (request_id,))
        existing = cur.fetchone()

        if not existing:
            cur.execute("""
                INSERT INTO trade_intents (request_id, buyer_started, seller_started)
                VALUES (%s, %s, %s)
            """, (
                request_id,
                user_id == buyer_id,
                user_id == seller_id
            ))
        else:
            if user_id == buyer_id:
                cur.execute("UPDATE trade_intents SET buyer_started = TRUE WHERE request_id = %s", (request_id,))
            elif user_id == seller_id:
                cur.execute("UPDATE trade_intents SET seller_started = TRUE WHERE request_id = %s", (request_id,))
            else:
                return {"status": "error", "details": "User not part of this trade"}

        conn.commit()
        return {"status": "ok"}

    except Exception as e:
        return {"status": "error", "details": str(e)}

    finally:
        cur.close()
        conn.close()

@router.get("/trade-intent")
def get_trade_intent(request_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT buyer_started, seller_started FROM trade_intents WHERE request_id = %s", (request_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"buyer_started": False, "seller_started": False}

    return {"buyer_started": row[0], "seller_started": row[1]}

@router.post("/trade/initiate")
def initiate_trade(
    request_id: int = Form(...),
    user: int = Depends(get_current_user)
):
    print(f"🔁 Initiating trade for request_id={request_id}")
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Fetch buyer/seller/item from trade_requests
        cur.execute("""
            SELECT buyer_id, owner_id, post_id
            FROM trade_requests
            WHERE id = %s
        """, (request_id,))
        request_row = cur.fetchone()
        if not request_row:
            return {"status": "error", "details": "Invalid request_id"}

        buyer_id, seller_id, post_id = request_row
        cur.execute("SELECT caption FROM posts WHERE id = %s", (post_id,))
        post_row = cur.fetchone()
        if not post_row:
            return {"status": "error", "details": "Post not found for this request"}

        item = post_row[0]
        price = 0  # Default price

        # 2. Check mutual intent
        cur.execute("SELECT buyer_started, seller_started FROM trade_intents WHERE request_id = %s", (request_id,))
        intent = cur.fetchone()
        if not intent or not (intent[0] and intent[1]):
            return {"status": "error", "details": "Both parties must confirm intent before initiating trade"}

        # 3. Check for existing trade
        cur.execute("SELECT id FROM trades WHERE request_id = %s", (request_id,))
        existing = cur.fetchone()
        if existing:
            return {"status": "ok", "trade_id": existing[0], "message": "Trade already exists"}

        # 4. Fetch chat messages
        cur.execute("""
            SELECT sender_id, message
            FROM chat
            WHERE trade_request_id = %s
            ORDER BY timestamp ASC
        """, (request_id,))
        messages = cur.fetchall()

        buyer_msgs = [msg for uid, msg in messages if uid == buyer_id]
        seller_msgs = [msg for uid, msg in messages if uid == seller_id]
        buyer_context = "\n".join([f"Buyer: {msg}" for msg in buyer_msgs])
        seller_context = "\n".join([f"Seller: {msg}" for msg in seller_msgs])

        # 5. Extract demands with fallback
        def extract_with_fallback(context, role):
            try:
                return extract_demand_from_chat_gemini(context, role=role)
            except:
                try:
                    return extract_demand_from_chat(context, role=role)
                except:
                    return extract_demand_from_chat_deepseek(context, role=role)

        buyer_demand = extract_with_fallback(buyer_context, "buyer")
        seller_demand = extract_with_fallback(seller_context, "seller")

        # 6. Encrypt payload
        payload = {
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "item": item,
            "price": price,
            "buyer_demand": buyer_demand,
            "seller_demand": seller_demand
        }
        encrypted = encrypt_payload(payload)

        # 7. Insert trade
        cur.execute("""
            INSERT INTO trades (buyer_id, seller_id, item, price, encrypted_payload, request_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (buyer_id, seller_id, item, price, encrypted, request_id))
        trade_id = cur.fetchone()[0]

        # 8. Insert trade_terms version 1
        cur.execute("""
            INSERT INTO trade_terms (
                trade_id, version, buyer_demand, seller_demand, terms_text,
                buyer_accepted, seller_accepted, finalized
            )
            VALUES (%s, 1, %s, %s, '', FALSE, FALSE, FALSE)
        """, (trade_id, buyer_demand, seller_demand))

        # 9. Log activity
        cur.execute("""
            INSERT INTO trade_activity_log (trade_id, user_id, action, detail, timestamp)
            VALUES (%s, %s, %s, %s, NOW())
        """, (trade_id, user, "initiated_trade", f"Trade initiated by user {user}"))

        # 10. Insert default milestones
        milestones = [
            ("Terms Proposed", "Agreement on trade terms"),
            ("Terms Accepted", "Both parties accept terms"),
            ("Escrow Deposited", "Buyer deposits funds"),
            ("Product Delivered", "Seller delivers product"),
            ("Trade Completed", "Buyer confirms delivery")
        ]
        for title, desc in milestones:
            cur.execute("""
                INSERT INTO trade_milestones (trade_id, title, description, delivered, confirmed)
                VALUES (%s, %s, %s, FALSE, FALSE)
            """, (trade_id, title, desc))

        conn.commit()
        return {"message": "Trade initiated", "trade_id": trade_id, "encrypted": encrypted}

    except Exception as e:
        conn.rollback()
        return {"status": "error", "details": str(e)}

    finally:
        cur.close()
        conn.close()

@router.put("/trade/details/update")
def update_trade_details(
    trade_id: int = Form(...),
    item: str = Form(...),
    price: float = Form(...),
    deadline: str = Form(...),  # ISO string
    demand: str = Form(...),  # This will be buyer OR seller demand
    user: int = Depends(get_current_user)
):
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Get buyer and seller IDs
        cur.execute("SELECT buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "details": "Trade not found"}
        buyer_id, seller_id = row

        # 2. Determine role
        if user == buyer_id:
            demand_column = "buyer_demand"
        elif user == seller_id:
            demand_column = "seller_demand"
        else:
            return {"status": "error", "details": "You are not a participant in this trade"}

        # 3. Update trades table
        cur.execute("""
            UPDATE trades
            SET item = %s, price = %s, deadline = %s
            WHERE id = %s
        """, (item, price, deadline, trade_id))

        # 4. Update user's own demand in latest trade_terms version
        cur.execute(f"""
            UPDATE trade_terms
            SET {demand_column} = %s
            WHERE trade_id = %s
              AND version = (
                  SELECT MAX(version)
                  FROM trade_terms
                  WHERE trade_id = %s
              )
        """, (demand, trade_id, trade_id))

        conn.commit()
        return {"message": f"{demand_column.replace('_', ' ').capitalize()} updated successfully"}

    except Exception as e:
        conn.rollback()
        print("❌ Update failed:", str(e))
        return {"status": "error", "details": str(e)}

    finally:
        cur.close()
        conn.close()

@router.get("/trade/details/fetch")
def fetch_trade_details(trade_id: int, user: int = Depends(get_current_user)):
    try:
        conn = get_connection()
        cur = conn.cursor()

        print(f"🔍 Fetching trade_id={trade_id} for user={user} ({type(user)})")

        # 1. Get trade basics
        cur.execute("""
            SELECT item, price, deadline, created_at, buyer_id, seller_id
            FROM trades
            WHERE id = %s
        """, (trade_id,))
        trade = cur.fetchone()
        if not trade:
            return {"status": "error", "details": "Trade not found"}

        item, price, deadline,created_at, buyer_id, seller_id = trade
        print(f"📦 Trade row: buyer_id={buyer_id}, seller_id={seller_id}")

        # 2. Get latest trade_terms
        cur.execute("""
            SELECT version, buyer_demand, seller_demand
            FROM trade_terms
            WHERE trade_id = %s
            ORDER BY version DESC
            LIMIT 1
        """, (trade_id,))
        terms = cur.fetchone()
        if not terms:
            return {"status": "error", "details": "No trade terms found"}

        version, buyer_demand, seller_demand = terms

        # 3. Ensure user is int
        user = int(user)

        # 4. Determine role
        if user == buyer_id:
            role = "buyer"
            demand = buyer_demand
            other_demand = seller_demand
            other_user_id = seller_id
        elif user == seller_id:
            role = "seller"
            demand = seller_demand
            other_demand = buyer_demand
            other_user_id = buyer_id
        else:
            print(f"❌ User {user} is not authorized for trade {trade_id}")
            return JSONResponse(
                status_code=403,
                content={"status": "error", "details": "You are not a participant in this trade"}
            )

        # 5. Get other user's name
        cur.execute("SELECT username FROM users WHERE id = %s", (other_user_id,))
        other_user_name = cur.fetchone()[0] if cur.rowcount else "Unknown"

        print(f"✅ Role: {role}, Other user: {other_user_name}")

        return {
            "status": "ok",
            "trade_id": trade_id,
            "item": item,
            "price": price,
            "deadline": deadline.isoformat() if deadline else None,
            "role": role,
            "demand": demand,
            "other_demand": other_demand,
            "other_user_name": other_user_name,
            "created_at": created_at.isoformat() if created_at else None
        }

    except Exception as e:
        print(f"🔥 Exception: {e}")
        return {"status": "error", "details": str(e)}

    finally:
        cur.close()
        conn.close()

@router.put("/trade/intent/proceed")
async def proceed_trade_intent(request: Request):
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        data = await request.json()
        request_id = data.get("request_id")
        role = data.get("role")
        print("Incoming request_id:", request_id)
        print("Incoming role:", role)
        if not request_id or not role:
            raise HTTPException(status_code=400, detail="Missing request_id or role")

        if role not in ["buyer", "seller"]:
            raise HTTPException(status_code=400, detail="Invalid role")

        column = f"{role}_proceeded"

        cur.execute(f"""
            UPDATE trade_intents
            SET {column} = TRUE
            WHERE request_id = %s
        """, (request_id,))
        conn.commit()

        cur.execute("""
            SELECT buyer_proceeded, seller_proceeded
            FROM trade_intents
            WHERE request_id = %s
        """, (request_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trade intent not found")

        return {
            "status": "ok",
            "buyer_proceeded": row[0],
            "seller_proceeded": row[1]
        }

    except Exception as e:
        print("🔥 Proceed intent error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        cur.close()
        conn.close()

@router.get("/trade/intent/status")
def check_proceed_status(request_id: str):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT buyer_proceeded, seller_proceeded
            FROM trade_intents
            WHERE request_id = %s
        """, (request_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trade intent not found")

        return {
            "buyer_proceeded": row[0],
            "seller_proceeded": row[1]
        }

    except Exception as e:
        print("🔥 Status check error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        cur.close()
        conn.close()

@router.post("/trade/confirm")
def confirm_trade(trade_id: int = Form(...), user_id: int = Form(...)):
    # This might be redundant if we are using specific milestone confirmations, 
    # but keeping it for backward compatibility or general "I'm here" confirmation if needed.
    # For now, let's assume this is about confirming the trade *request* itself before terms.
    
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
        action = "buyer_confirmed"
    elif user_id == seller_id and not seller_confirmed:
        cur.execute("UPDATE trades SET seller_confirmed = TRUE WHERE id = %s", (trade_id,))
        action = "seller_confirmed"
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Invalid user or already confirmed"}

    # Log activity
    cur.execute("""
        INSERT INTO trade_activity_log (trade_id, user_id, action, detail, timestamp)
        VALUES (%s, %s, %s, %s, NOW())
    """, (trade_id, user_id, action, f"User {user_id} confirmed trade"))

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
def view_trade(trade_id: int, user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    # Fetch encrypted payload and request_id
    cur.execute("SELECT encrypted_payload, request_id, buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    encrypted_payload, request_id, buyer_id, seller_id = result
    decrypted = decrypt_payload(encrypted_payload)

    # Determine the other party
    other_id = seller_id if user == buyer_id else buyer_id

    # Fetch other party's name and avatar
    cur.execute("SELECT username, avatar_url FROM users WHERE id = %s", (other_id,))
    user_row = cur.fetchone()
    other_party_name = user_row[0] if user_row else f"User {other_id}"
    other_party_avatar_url = user_row[1] if user_row else None

    cur.close()
    conn.close()

    return {
        "trade_id": trade_id,
        "details": {
            **decrypted,
            "request_id": request_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "other_party_name": other_party_name,
            "other_party_avatar_url": other_party_avatar_url,
            "role": "buyer" if user == buyer_id else "seller"
        }
    }

@router.post("/trade/terms/generate")
async def generate_terms(request: Request):
    data = await request.json()
    trade_id = data.get("request_id")

    if not trade_id:
        raise HTTPException(status_code=400, detail="Missing trade_id")
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1. Get trade details + usernames
        cur.execute("""
            SELECT t.buyer_id, t.seller_id, t.item, b.username, s.username
            FROM trades t
            JOIN users b ON t.buyer_id = b.id
            JOIN users s ON t.seller_id = s.id
            WHERE t.id = %s
        """, (trade_id,))
        result = cur.fetchone()
        if not result:
            return {"status": "error", "details": "Trade not found"}

        buyer_id, seller_id, item, buyer_name, seller_name = result

        # 2. Get latest demands
        cur.execute("""
            SELECT version, buyer_demand, seller_demand
            FROM trade_terms
            WHERE trade_id = %s
            ORDER BY version DESC
            LIMIT 1
        """, (trade_id,))
        row = cur.fetchone()
        if not row:
            return {"status": "error", "details": "No trade terms found"}

        version, buyer_demand, seller_demand = row
        new_version = version + 1

        # 3. Generate terms with fallback
        def generate_terms_with_fallback():
            try:
                return generate_trade_terms_gemini(buyer_demand, seller_demand, item, "Buyer"), "gemini"
            except:
                try:
                    return generate_trade_terms(buyer_demand, seller_demand, item, "Buyer"), "openai"
                except:
                    return generate_trade_terms_deepseek(buyer_demand, seller_demand, item, "Buyer"), "deepseek"

        terms, terms_provider = generate_terms_with_fallback()

        # 4. Replace placeholders and currency
        terms = terms.replace("[Buyer Name/Tradea ID]", buyer_name)
        terms = terms.replace("[Seller Name/Tradea ID]", seller_name)
        terms = terms.replace("$", "₹")

        # 5. Insert new trade_terms version
        cur.execute("""
            INSERT INTO trade_terms (
                trade_id, version, buyer_demand, seller_demand, terms_text,
                buyer_accepted, seller_accepted, finalized, edited_at
            )
            VALUES (%s, %s, %s, %s, %s, FALSE, FALSE, FALSE, %s)
        """, (
            trade_id, new_version,
            buyer_demand, seller_demand,
            terms, datetime.utcnow()
        ))

        # 6. Update milestone
        cur.execute("""
            UPDATE trade_milestones
            SET delivered = TRUE, confirmed = TRUE
            WHERE trade_id = %s AND title = 'Terms Proposed'
        """, (trade_id,))

        conn.commit()
        return {
            "message": "Terms generated",
            "version": new_version,
            "buyer_demand": buyer_demand,
            "seller_demand": seller_demand,
            "terms": terms,
            "providers": {
                "terms": terms_provider
            }
        }

    except Exception as e:
        conn.rollback()
        return {"status": "error", "details": str(e)}

    finally:
        cur.close()
        conn.close()

@router.get("/trade/terms/view")
def view_latest_terms(trade_id: int, user: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    # Fetch latest version of terms for this trade
    cur.execute("""
        SELECT version, terms_text, buyer_demand, seller_demand,
               buyer_accepted, seller_accepted, edited_by, edited_at
        FROM trade_terms
        WHERE trade_id = %s
        ORDER BY version DESC
        LIMIT 1
    """, (trade_id,))
    row = cur.fetchone()

    if not row:
        cur.close()
        conn.close()
        return {"status": "error", "details": "No terms found for this trade"}

    version, terms_text, buyer_demand, seller_demand, buyer_accepted, seller_accepted, edited_by, edited_at = row

    # Determine role
    cur.execute("SELECT buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
    trade_row = cur.fetchone()
    buyer_id, seller_id = trade_row
    role = "buyer" if user == buyer_id else "seller"

    cur.close()
    conn.close()

    return {
        "status": "ok",
        "version": version,
        "terms_text": terms_text,
        "user_demand": buyer_demand if role == "buyer" else seller_demand,
        "other_demand": seller_demand if role == "buyer" else buyer_demand,
        "accepted": {
            "buyer": buyer_accepted,
            "seller": seller_accepted
        },
        "edited_by": edited_by,
        "edited_at": edited_at,
        "role": role
    }

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

    # Get current latest terms to copy demands if needed, or just insert new version
    cur.execute("""
        SELECT buyer_demand, seller_demand, version 
        FROM trade_terms 
        WHERE trade_id = %s 
        ORDER BY version DESC LIMIT 1
    """, (trade_id,))
    current_terms = cur.fetchone()
    
    if current_terms:
        buyer_demand, seller_demand, current_version = current_terms
        new_version = current_version + 1
    else:
        # Fallback if no terms exist yet (shouldn't happen if generated first)
        buyer_demand = ""
        seller_demand = ""
        new_version = 1

    # Insert new version of terms
    cur.execute("""
        INSERT INTO trade_terms (
            trade_id, version, buyer_demand, seller_demand, terms_text, 
            buyer_accepted, seller_accepted, finalized, edited_by, edited_at
        )
        VALUES (%s, %s, %s, %s, %s, FALSE, FALSE, FALSE, %s, NOW())
    """, (trade_id, new_version, buyer_demand, seller_demand, edited_terms, user_id))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Terms updated. Both users must re-accept.", "version": new_version}

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

    # Get latest terms version
    cur.execute("SELECT id, version FROM trade_terms WHERE trade_id = %s ORDER BY version DESC LIMIT 1", (trade_id,))
    term_row = cur.fetchone()
    
    if not term_row:
        cur.close()
        conn.close()
        return {"status": "error", "details": "No terms found for this trade"}
        
    term_id, version = term_row

    if user_id == buyer_id:
        cur.execute("UPDATE trade_terms SET buyer_accepted = TRUE WHERE id = %s", (term_id,))
    elif user_id == seller_id:
        cur.execute("UPDATE trade_terms SET seller_accepted = TRUE WHERE id = %s", (term_id,))
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "User not part of this trade"}

    conn.commit()

    # Check if both accepted
    cur.execute("""
        SELECT buyer_accepted, seller_accepted
        FROM trade_terms WHERE id = %s
    """, (term_id,))
    accepted = cur.fetchone()
    
    if accepted[0] and accepted[1]:
        # Mark as finalized
        cur.execute("UPDATE trade_terms SET finalized = TRUE WHERE id = %s", (term_id,))
        
        # Update milestone 'Terms Accepted'
        cur.execute("""
            UPDATE trade_milestones 
            SET delivered = TRUE, confirmed = TRUE 
            WHERE trade_id = %s AND title = 'Terms Accepted'
        """, (trade_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Both users accepted terms. Trade is ready for escrow."}
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

    # Update milestone
    cur.execute("""
        UPDATE trade_milestones 
        SET delivered = TRUE, confirmed = TRUE 
        WHERE trade_id = %s AND title = 'Escrow Deposited'
    """, (trade_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Escrow locked",
        "payment_reference": payment_ref
    }

@router.post("/trade/escrow/release")
def release_escrow(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Check if trade is completed
    cur.execute("SELECT trade_completed, buyer_id FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    trade_completed, buyer_id = result

    if not trade_completed:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade must be completed before releasing escrow"}

    cur.execute("""
        UPDATE trades 
        SET escrow_locked = FALSE 
        WHERE id = %s
    """, (trade_id,))

    # Log activity
    cur.execute("""
        INSERT INTO trade_activity_log (trade_id, user_id, action, detail, timestamp)
        VALUES (%s, %s, 'escrow_released', 'Funds released to seller', NOW())
    """, (trade_id, user_id))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Escrow released successfully"}

@router.post("/trade/deliver")
def deliver_product(trade_id: int = Form(...), user_id: int = Form(...), delivery_link: str = Form(None)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT seller_id FROM trades WHERE id = %s", (trade_id,))
    seller = cur.fetchone()

    if not seller or user_id != seller[0]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Unauthorized or trade not found"}

    # Insert or Update trade_delivery
    cur.execute("SELECT id FROM trade_delivery WHERE trade_id = %s", (trade_id,))
    delivery_row = cur.fetchone()

    if delivery_row:
        cur.execute("""
            UPDATE trade_delivery 
            SET seller_delivered = TRUE, delivery_link = COALESCE(%s, delivery_link)
            WHERE trade_id = %s
        """, (delivery_link, trade_id))
    else:
        cur.execute("""
            INSERT INTO trade_delivery (trade_id, seller_delivered, delivery_link)
            VALUES (%s, TRUE, %s)
        """, (trade_id, delivery_link))
    
    # Sync trades table for list views - REMOVED as column doesn't exist
    # cur.execute("UPDATE trades SET seller_delivered = TRUE WHERE id = %s", (trade_id,))
    
    # Update milestone
    cur.execute("""
        UPDATE trade_milestones 
        SET delivered = TRUE, confirmed = TRUE 
        WHERE trade_id = %s AND title = 'Product Delivered'
    """, (trade_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Product marked as delivered"}

@router.post("/trade/complete")
def complete_trade(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT buyer_id FROM trades WHERE id = %s", (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id = result[0]
    
    # Check delivery status
    cur.execute("SELECT seller_delivered FROM trade_delivery WHERE trade_id = %s", (trade_id,))
    delivery_res = cur.fetchone()
    
    if not delivery_res or not delivery_res[0]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Seller has not marked delivery yet"}

    if user_id != buyer_id:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Only buyer can confirm delivery and complete trade"}

    # Update trade_delivery (buyer_confirmed)
    cur.execute("UPDATE trade_delivery SET buyer_confirmed = TRUE WHERE trade_id = %s", (trade_id,))

    # Insert into trade_completion
    cur.execute("""
        INSERT INTO trade_completion (trade_id, completed, confirmed_by, notes)
        VALUES (%s, TRUE, %s, 'Trade completed successfully')
    """, (trade_id, user_id))

    # Update milestone
    cur.execute("""
        UPDATE trade_milestones 
        SET delivered = TRUE, confirmed = TRUE 
        WHERE trade_id = %s AND title = 'Trade Completed'
    """, (trade_id,))
    
    # Also mark main trade table as completed - REMOVED as column doesn't exist
    # cur.execute("UPDATE trades SET trade_completed = TRUE WHERE id = %s", (trade_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade completed. Agreement now downloadable."}

@router.get("/trade/terms/download")
def download_terms(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # Join with trade_terms to get the text
    cur.execute("""
        SELECT tt.terms_text, tt.buyer_accepted, tt.seller_accepted, t.trade_completed
        FROM trades t
        LEFT JOIN trade_terms tt ON t.id = tt.trade_id
        WHERE t.id = %s
        ORDER BY tt.version DESC LIMIT 1
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
                encrypted_payload, buyer_demand, seller_demand
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            buyer_id, seller_id, item, price,
            encrypted_payload, buyer_demand, seller_demand
        ))

        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Trade created"}
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.get("/trade/status")
def get_trade_status(trade_id: int = None, request_id: int = None):
    conn = get_connection()
    cur = conn.cursor()

    # Resolve trade_id from request_id if needed
    if not trade_id and request_id:
        cur.execute("SELECT id FROM trades WHERE request_id = %s", (request_id,))
        row = cur.fetchone()
        if row:
            trade_id = row[0]

    if not trade_id:
        cur.close()
        conn.close()
        return {"status": "not_found", "details": "No trade found for given request"}

    # 1. Basic trade info
    cur.execute("SELECT escrow_locked FROM trades WHERE id = %s", (trade_id,))
    trade_row = cur.fetchone()
    if not trade_row:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}
    escrow_locked = trade_row[0]

    # 2. Completion status
    cur.execute("SELECT completed FROM trade_completion WHERE trade_id = %s", (trade_id,))
    comp_row = cur.fetchone()
    trade_completed = comp_row[0] if comp_row else False

    # 3. Terms status
    cur.execute("""
        SELECT buyer_accepted, seller_accepted 
        FROM trade_terms 
        WHERE trade_id = %s 
        ORDER BY version DESC LIMIT 1
    """, (trade_id,))
    terms_row = cur.fetchone()
    buyer_accepted_terms = terms_row[0] if terms_row else False
    seller_accepted_terms = terms_row[1] if terms_row else False

    # 4. Delivery status
    cur.execute("""
        SELECT seller_delivered, buyer_confirmed 
        FROM trade_delivery 
        WHERE trade_id = %s
    """, (trade_id,))
    delivery_row = cur.fetchone()
    seller_delivered = delivery_row[0] if delivery_row else False
    buyer_confirmed_delivery = delivery_row[1] if delivery_row else False

    cur.close()
    conn.close()

    status = {
        "buyer_accepted_terms": buyer_accepted_terms,
        "seller_accepted_terms": seller_accepted_terms,
        "escrow_locked": escrow_locked,
        "seller_delivered": seller_delivered,
        "buyer_confirmed_delivery": buyer_confirmed_delivery,
        "trade_completed": trade_completed
    }

    return {"trade_id": trade_id, "status": status}

@router.post("/trade/swap/confirm")
def confirm_swap(trade_id: int = Form(...), user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Get buyer/seller IDs and current flags from trade_delivery
    cur.execute("""
        SELECT t.buyer_id, t.seller_id,
               COALESCE(td.buyer_confirmed, FALSE), COALESCE(td.seller_delivered, FALSE)
        FROM trades t
        LEFT JOIN trade_delivery td ON t.id = td.trade_id
        WHERE t.id = %s
    """, (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, buyer_confirmed, seller_delivered = result

    # Step 2: Update delivery flags based on user role
    # First ensure a record exists in trade_delivery
    cur.execute("INSERT INTO trade_delivery (trade_id) VALUES (%s) ON CONFLICT (trade_id) DO NOTHING", (trade_id,))
    
    if user_id == buyer_id and not buyer_confirmed:
        cur.execute("UPDATE trade_delivery SET buyer_confirmed = TRUE WHERE trade_id = %s", (trade_id,))
    elif user_id == seller_id and not seller_delivered:
        cur.execute("UPDATE trade_delivery SET seller_delivered = TRUE WHERE trade_id = %s", (trade_id,))
    else:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Invalid user or already confirmed"}

    conn.commit()

    # Step 3: Check if both sides have confirmed
    cur.execute("""
        SELECT buyer_confirmed, seller_delivered
        FROM trade_delivery WHERE trade_id = %s
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

    # Fetch all trades where the user is buyer or seller
    cur.execute("""
        SELECT t.id, t.item, t.price,
               t.buyer_id, t.seller_id,
               COALESCE(td.buyer_confirmed, FALSE) as buyer_confirmed_delivery,
               COALESCE(td.seller_delivered, FALSE) as seller_delivered,
               COALESCE(tc.completed, FALSE) as trade_completed,
               COALESCE(t.is_cancelled, FALSE) as is_cancelled
        FROM trades t
        LEFT JOIN trade_delivery td ON t.id = td.trade_id
        LEFT JOIN trade_completion tc ON t.id = tc.trade_id
        WHERE t.buyer_id = %s OR t.seller_id = %s
        ORDER BY t.id DESC
    """, (user_id, user_id))

    rows = cur.fetchall()
    trades = []

    for row in rows:
        (
            trade_id, item, price,
            buyer_id, seller_id,
            buyer_confirmed, seller_delivered,
            trade_completed, is_cancelled
        ) = row

        # Determine the other party
        other_id = seller_id if user_id == buyer_id else buyer_id

        # Fetch other party's name and avatar
        cur.execute("SELECT username, avatar_url FROM users WHERE id = %s", (other_id,))
        other_row = cur.fetchone()
        other_name = other_row[0] if other_row and other_row[0] else f"User {other_id}"
        other_avatar = other_row[1] if other_row and other_row[1] else None

        trades.append({
            "trade_id": trade_id,
            "item": item,
            "price": price,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "buyer_confirmed_delivery": buyer_confirmed,
            "seller_delivered": seller_delivered,
            "trade_completed": trade_completed,
            "is_cancelled": is_cancelled,
            "other_party_name": other_name,
            "other_party_avatar_url": other_avatar
        })

    cur.close()
    conn.close()
    return {"trades": trades}

@router.post("/trade/upload")
def upload_trade_files(
    trade_id: int = Form(...),
    uploader_id: int = Form(...),
    files: List[UploadFile] = File([]),
    links: List[str] = Form([])
):
    conn = get_connection()
    cur = conn.cursor()

    # Validate trade and user
    cur.execute("SELECT buyer_id, seller_id FROM trades WHERE id = %s", (trade_id,))
    trade = cur.fetchone()
    if not trade or uploader_id not in trade:
        cur.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Invalid trade or user")

    upload_dir = Path("Files")
    upload_dir.mkdir(exist_ok=True)

    uploaded = []

    # Handle file uploads
    for file in files:
        if file.filename:
            file_path = upload_dir / f"trade_{trade_id}_{file.filename}"
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/static/files/{file_path.name}"
            cur.execute("""
                INSERT INTO products (trade_id, owner_id, file_url, title, description)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (trade_id, uploader_id, file_url, file.filename, f"Trade delivery file: {file.filename}"))
            file_id, created_at = cur.fetchone()
            uploaded.append({
                "id": file_id,
                "url": file_url,
                "name": file.filename,
                "type": file.content_type,
                "uploaded_at": created_at.isoformat()
            })

    # Handle external links
    for link in links:
        if link.strip():
            title = link.split("/")[-1] or "External Link"
            cur.execute("""
                INSERT INTO products (trade_id, owner_id, file_url, title, description)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (trade_id, uploader_id, link, title, "External delivery link"))
            file_id, created_at = cur.fetchone()
            uploaded.append({
                "id": file_id,
                "url": link,
                "name": title,
                "type": "link",
                "uploaded_at": created_at.isoformat()
            })

    conn.commit()
    cur.close()
    conn.close()

    return JSONResponse(content={"message": "Uploaded successfully", "files": uploaded})

@router.get("/trade/files")
def get_trade_files(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trade_id, owner_id, title, file_url, description, created_at
        FROM products
        WHERE trade_id = %s
        ORDER BY created_at ASC
    """, (trade_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    files = [
        {
            "id": row[0],
            "trade_id": row[1],
            "owner_id": row[2],
            "title": row[3],
            "file_url": row[4],
            "description": row[5],
            "uploaded_at": row[6].isoformat()
        }
        for row in rows
    ]
    return {"files": files}

@router.patch("/trade/{trade_id}/cancel")
def cancel_trade(trade_id: int, user_id: int = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Fetch trade details
    cur.execute("""
        SELECT buyer_id, seller_id, escrow_locked
        FROM trades WHERE id = %s
    """, (trade_id,))
    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade not found"}

    buyer_id, seller_id, escrow_locked = result

    # Step 2: Check if user is part of the trade
    if user_id not in [buyer_id, seller_id]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "User not part of this trade"}

    # Step 3: Check if escrow is locked
    if escrow_locked:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Cannot cancel after escrow is locked"}

    # Step 4: Check if trade is already completed
    cur.execute("SELECT completed FROM trade_completion WHERE trade_id = %s", (trade_id,))
    comp_res = cur.fetchone()
    if comp_res and comp_res[0]:
        cur.close()
        conn.close()
        return {"status": "error", "details": "Trade already completed"}

    # Step 5: Mark trade as cancelled
    cur.execute("""
        UPDATE trades
        SET is_cancelled = TRUE
        WHERE id = %s
    """, (trade_id,))

    # Optional: Reset delivery status
    cur.execute("""
        UPDATE trade_delivery
        SET seller_delivered = FALSE, buyer_confirmed = FALSE
        WHERE trade_id = %s
    """, (trade_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Trade cancelled successfully"}

@router.get("/trade/view")
def view_trade(trade_id: int):
    conn = get_connection()
    cur = conn.cursor()

    # Fetch trade details with completion status
    cur.execute("""
        SELECT t.id, t.item, t.price, t.buyer_id, t.seller_id, 
               t.buyer_demand, t.seller_demand, t.status, t.created_at,
               t.escrow_locked, COALESCE(tc.completed, FALSE) as trade_completed
        FROM trades t
        LEFT JOIN trade_completion tc ON t.id = tc.trade_id
        WHERE t.id = %s
    """, (trade_id,))
    
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade_details = {
        "id": row[0],
        "item": row[1],
        "price": row[2],
        "buyer_id": row[3],
        "seller_id": row[4],
        "buyer_demand": row[5],
        "seller_demand": row[6],
        "status": row[7],
        "created_at": row[8].isoformat() if row[8] else None,
        "escrow_locked": row[9],
        "trade_completed": row[10]
    }

    return {"details": trade_details}

