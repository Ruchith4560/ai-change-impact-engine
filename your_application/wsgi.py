"""Fallback WSGI/ASGI wrapper for Render's default 'gunicorn your_application.wsgi' command."""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
INTELLIGENCE_DIR = ROOT_DIR / "intelligence_service"
if str(INTELLIGENCE_DIR) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_DIR))

from app.main import app

# Export application for WSGI (Gunicorn) and app for ASGI (Uvicorn)
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
except ImportError:
    application = app

app = app
