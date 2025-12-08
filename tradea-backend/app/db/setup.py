from app.db.database import get_connection

def setup_db():
    conn = get_connection()
    cur = conn.cursor()
    
    # Create trade_files table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS trade_files (
            id SERIAL PRIMARY KEY,
            trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
            uploader_id INTEGER,
            file_url TEXT NOT NULL,
            file_type TEXT,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # Create trade_completion table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS trade_completion (
            id SERIAL PRIMARY KEY,
            trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
            completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    conn.commit()
    cur.close()
    conn.close()
    print("Database setup completed.")

if __name__ == "__main__":
    setup_db()
