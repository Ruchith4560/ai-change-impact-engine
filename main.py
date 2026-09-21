"""Root application entrypoint for cloud hosting (Render, Railway, Fly.io, Cloud Run)."""
import os
import sys
from pathlib import Path

# Add intelligence_service to sys.path so app modules (app.core, app.api, etc.) resolve seamlessly
ROOT_DIR = Path(__file__).resolve().parent
INTELLIGENCE_DIR = ROOT_DIR / "intelligence_service"
if str(INTELLIGENCE_DIR) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_DIR))

from app.main import app

# Export FastAPI instance as both 'app' and 'application' for ASGI runners (Uvicorn, Gunicorn with UvicornWorker)
application = app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
