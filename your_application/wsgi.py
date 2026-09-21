"""Fallback WSGI/ASGI wrapper for Render's default 'gunicorn your_application.wsgi' command."""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
INTELLIGENCE_DIR = ROOT_DIR / "intelligence_service"
if str(INTELLIGENCE_DIR) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_DIR))

from app.main import app

# Direct ASGI app reference for Uvicorn
app = app

# Universal callable supporting both sync WSGI (environ, start_response)
# and async ASGI (scope, receive, send) for any Gunicorn/Uvicorn worker type
try:
    from a2wsgi import ASGIMiddleware
    _wsgi_app = ASGIMiddleware(app)
except ImportError:
    _wsgi_app = None


class UniversalApplication:
    """Dispatches to WSGI adapter if called with 2 args, or directly to ASGI if called with 3 args."""
    def __init__(self, asgi_app, wsgi_app):
        self.asgi_app = asgi_app
        self.wsgi_app = wsgi_app

    def __call__(self, *args, **kwargs):
        if len(args) == 2:
            # (environ, start_response) -> WSGI sync worker
            if self.wsgi_app is not None:
                return self.wsgi_app(*args, **kwargs)
            _environ, start_response = args
            start_response("500 Internal Server Error", [("Content-Type", "text/plain")])
            return [b"a2wsgi not installed. Run with uvicorn or install a2wsgi."]
        # (scope, receive, send) -> ASGI async worker
        return self.asgi_app(*args, **kwargs)


application = UniversalApplication(app, _wsgi_app)
