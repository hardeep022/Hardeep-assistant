import os
import secrets

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "nova.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# JWT
JWT_SECRET = os.environ.get("NOVA_JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Server
HOST = "127.0.0.1"
PORT = 8599

# AI
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEFAULT_MODEL = "gpt-4o-mini"
MAX_CONVERSATION_MESSAGES = 20  # sliding window for context

# Rate Limiting
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 60
