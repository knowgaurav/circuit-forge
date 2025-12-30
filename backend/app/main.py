"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import components, courses, health, sessions
from app.core.config import settings
from app.core.database import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    await db_manager.connect()
    yield
    # Shutdown
    await db_manager.disconnect()


app = FastAPI(
    title=settings.app_name,
    description="Collaborative Circuit Design Platform API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "description": "Collaborative Circuit Design Platform API",
        "docs": "/docs",
        "health": "/health",
    }

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
app.include_router(courses.router, prefix="/api", tags=["Courses"])
app.include_router(components.router, tags=["Components"])
