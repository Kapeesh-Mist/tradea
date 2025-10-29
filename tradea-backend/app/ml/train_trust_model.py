from dotenv import load_dotenv
import os
import psycopg2
import joblib
from sklearn.ensemble import RandomForestRegressor

load_dotenv()
# Step 1: Connect to DB
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS")
)
cur = conn.cursor()

# Step 2: Fetch trade data
cur.execute("""
    SELECT buyer_id, seller_id, trade_completed, seller_delivered,
           buyer_confirmed_delivery, buyer_demand, seller_demand
    FROM trades
""")
rows = cur.fetchall()

# Step 3: Build dataset
X, y = [], []
for row in rows:
    completed = int(row[2])
    delivered = int(row[3])
    confirmed = int(row[4])
    edited_terms = int(bool(row[5] or row[6]))
    total_trades = 1  # You can later fetch actual totals per user

    features = [total_trades, completed, delivered, confirmed, edited_terms]
    label = round(
        0.5 * completed * 100 +
        0.3 * delivered * 100 +
        0.2 * (100 - edited_terms * 100)
    )

    X.append(features)
    y.append(label)

# Step 4: Train model
model = RandomForestRegressor()
model.fit(X, y)

# Step 5: Save model
joblib.dump(model, "app/ml/trust_model.pkl")

cur.close()
conn.close()
print("✅ Trust model trained and saved.")