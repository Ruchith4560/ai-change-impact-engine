"""Fallback WSGI/ASGI wrapper."""
import os
import sys
from pathlib import Path

CURR_DIR = Path(__file__).resolve().parent.parent
if str(CURR_DIR) not in sys.path:
    sys.path.insert(0, str(CURR_DIR))

from app.main import app

app = app

try:
    from a2wsgi import ASGIMiddleware
    _wsgi_app = ASGIMiddleware(app)
except ImportError:
    _wsgi_app = None


class UniversalApplication:
    def __init__(self, asgi_app, wsgi_app):
        self.asgi_app = asgi_app
        self.wsgi_app = wsgi_app

    def __call__(self, *args, **kwargs):
        if len(args) == 2:
            if self.wsgi_app is not None:
                return self.wsgi_app(*args, **kwargs)
            _environ, start_response = args
            start_response("500 Internal Server Error", [("Content-Type", "text/plain")])
            return [b"a2wsgi not installed."]
        return self.asgi_app(*args, **kwargs)


application = UniversalApplication(app, _wsgi_app)
