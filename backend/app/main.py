from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import logger
from app.database.session import init_db, SessionLocal
from app.database.seed import seed_database
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Crisis Response Intelligence System database...")
    init_db()
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    logger.info("CRIS Backend startup completed.")
    yield
    logger.info("CRIS Backend shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Restricted CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Custom Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", [])])
        msg = err.get("msg", "Invalid value")
        errors.append({"field": loc, "message": msg})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "detail": "Data ingestion validation failed",
            "errors": errors,
            "system_disclaimer": "CRIS Validation Engine enforces strict bounded factor ranges [0-100] and valid geo-coordinates.",
        },
    )


# Include API V1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "system": "Crisis Response Intelligence System (CRIS)",
        "version": settings.VERSION,
        "mode": "Demonstration / Decision-Support Only",
        "database": "Connected",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Crisis Response Intelligence System API",
        "documentation": "/docs",
        "health": "/api/health",
        "disclaimer": "Academic emergency decision-support prototype. Final decisions remain with emergency authorities.",
    }
