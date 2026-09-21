"""Intelligence service WSGI/ASGI entrypoint."""
import os
import sys
from pathlib import Path

CURR_DIR = Path(__file__).resolve().parent
if str(CURR_DIR) not in sys.path:
    sys.path.insert(0, str(CURR_DIR))

from app.main import app

# Export FastAPI instance as both 'app' and 'application' for Uvicorn and Gunicorn UvicornWorker
application = app
