"""Gunicorn configuration for cloud hosting (Render, Railway, Fly.io, Cloud Run)."""
import os

# Render and PaaS pass dynamic $PORT (default to 8000)
port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Concurrency & Worker model
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = 5

# Logging to stdout/stderr so Render live log stream captures everything
accesslog = "-"
errorlog = "-"
loglevel = "info"
