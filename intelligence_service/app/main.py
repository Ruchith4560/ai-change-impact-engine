"""FastAPI Application entrypoint for AI Change Impact Intelligence Service."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
