import asyncio

from fastapi import Depends, FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .core.config import get_settings
from .core.deps import get_leaderboard
from .services.leaderboard import Leaderboard

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.websocket("/ws/leaderboard")
async def leaderboard_socket(
  websocket: WebSocket,
  level: str = "endless",
  scope: str = "all",
  leaderboard: Leaderboard = Depends(get_leaderboard),
):
  await websocket.accept()
  try:
    while True:
      entries = leaderboard.top(level, scope=scope, limit=settings.leaderboard_size)
      await websocket.send_json({"entries": [entry.model_dump() for entry in entries]})
      await asyncio.sleep(2)
  except Exception:
    await websocket.close()
