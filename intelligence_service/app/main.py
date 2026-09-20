"""FastAPI Application entrypoint for AI Change Impact Intelligence Service."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from app.core.config import settings
from app.core.logging import get_logger
from app.api.health import router as health_router
from app.api.diff import router as diff_router
from app.api.ast import router as ast_router
from app.api.graph import router as graph_router
from app.api.risk import router as risk_router
from app.api.pipeline import router as pipeline_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for service startup and graceful shutdown."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}...")
    logger.info(f"Target Workspaces Directory: {settings.workspaces_dir}")
    yield
    logger.info("Shutting down Intelligence Service...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Computational intelligence engine for AST analysis, dependency graphs, and change-risk scoring.",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health_router)
app.include_router(diff_router)
app.include_router(ast_router)
app.include_router(graph_router)
app.include_router(risk_router)
app.include_router(pipeline_router)


@app.get("/", response_class=HTMLResponse)
async def root_status_page():
    """Root landing and system status overview for cloud deployments."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Change Impact Engine | API Service</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 1rem;
      max-width: 640px;
      width: 100%;
      padding: 2.25rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 1rem;
    }
    .badge-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.75rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: #1e293b;
      color: #f1f5f9;
      text-decoration: none;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border: 1px solid #334155;
      transition: all 0.2s;
    }
    .btn:hover { background: #334155; border-color: #475569; }
    .btn-primary { background: #0284c7; border-color: #0ea5e9; color: #fff; }
    .btn-primary:hover { background: #0369a1; }
    .stats {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .stat-row { display: flex; justify-content: space-between; }
    .stat-val { color: #38bdf8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      <span>SYSTEM OPERATIONAL (200 OK)</span>
    </div>
    <h1>AI Change Impact Engine</h1>
    <p>High-assurance computational intelligence service powering AST symbol extraction, reverse reachability blast-radius traversal, and calibrated risk scoring.</p>
    <div class="grid">
      <a href="/docs" class="btn btn-primary">⚡ Interactive Swagger UI</a>
      <a href="/health" class="btn">🩺 Health Status</a>
      <a href="https://Ruchith4560.github.io/ai-change-impact-engine/" target="_blank" class="btn">📊 Live UI Dashboard</a>
      <a href="https://github.com/Ruchith4560/ai-change-impact-engine" target="_blank" class="btn">🐙 GitHub Repo</a>
    </div>
    <div class="stats">
      <div class="stat-row"><span>Engine:</span><span class="stat-val">FastAPI + Tree-sitter + NetworkX</span></div>
      <div class="stat-row"><span>Status:</span><span class="stat-val" style="color:#34d399">Healthy / Active</span></div>
      <div class="stat-row"><span>Docs:</span><span class="stat-val"><a href="/docs" style="color:#38bdf8">/docs</a>, <a href="/redoc" style="color:#38bdf8">/redoc</a></span></div>
    </div>
  </div>
</body>
</html>"""


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global unhandled exception handler ensuring clean JSON errors."""
    logger.error(f"Unhandled error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred in the intelligence service.",
            "detail": str(exc) if settings.debug else None,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
