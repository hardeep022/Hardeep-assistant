from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.init_db import create_tables, close_db
from routers import auth, chat, tasks, conversations
from config import HOST, PORT


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown lifecycle."""
    await create_tables()
    yield
    await close_db()


app = FastAPI(
    title="Nova API",
    description="Backend API for Nova — Multilingual AI Desktop Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Electron renderer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(conversations.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
