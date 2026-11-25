from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER, require_roles
from app.database.session import get_db
from app.models.user import User
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.engines.simulation_engine import run_what_if_simulation

router = APIRouter(prefix="/simulation", tags=["What-If Simulation"])


@router.post("/run", response_model=SimulationResponse)
def execute_what_if_simulation(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER])),
):
    """
    Run an isolated what-if resource shortage and priority sensitivity simulation.
    Never writes or mutates operational database records.
    """
    return run_what_if_simulation(db, payload)

