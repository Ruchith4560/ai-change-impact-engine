"""Gunicorn configuration for cloud hosting."""
import os

port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = 5

accesslog = "-"
errorlog = "-"
loglevel = "info"
