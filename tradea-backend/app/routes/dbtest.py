from fastapi import APIRouter
from app.db.database import get_connection

router = APIRouter()

@router.get("/db/test")
def test_db():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        cur.close()
        conn.close()
        return {"status": "connected", "result": result}
    except Exception as e:
        return {"status": "error", "details": str(e)}