from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.resources import router as resources_router
from app.api.allocation import router as allocation_router
from app.api.priority import router as priority_router
from app.api.dashboard import router as dashboard_router
from app.api.analytics import router as analytics_router
from app.api.simulation import router as simulation_router
from app.api.alerts import router as alerts_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(incidents_router)
api_router.include_router(resources_router)
api_router.include_router(allocation_router)
api_router.include_router(priority_router)
api_router.include_router(analytics_router)
api_router.include_router(simulation_router)
api_router.include_router(alerts_router)
