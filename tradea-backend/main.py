from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import dbtest, users, trade
from app.routes.auth import auth_router
from app.routes.post import post_router
from app.routes.product import product_router
from app.routes import chat
from app.routes import messages
import os

app = FastAPI(
    title="Tradea",
    version="0.1.0",
    description="Trust-first digital trade platform for creators and freelancers. Powered by FastAPI + ML scoring."
)

# ✅ CORS setup — must come first
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Serve uploaded avatars from /static
app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

# ✅ Serve other uploaded files from /Files
app.mount(
    "/Files",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "Files")),
    name="Files"
)

# ✅ Route registration
app.include_router(dbtest.router, tags=["DB Test"])
app.include_router(users.router, tags=["User"])
app.include_router(trade.router, tags=["Trade"])
app.include_router(auth_router, tags=["Auth"])
app.include_router(post_router, tags=["Post"])
app.include_router(product_router, tags=["Product"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(messages.router, tags=["messages"])

# ✅ Root route
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Tradea backend is live!"}

# ✅ Health check route
@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok"}