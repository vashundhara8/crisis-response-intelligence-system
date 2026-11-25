import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.base import Base
from app.database.session import get_db
from app.database.seed import seed_database
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(test_engine):
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db, force_reset=False)
    yield db
    db.close()


@pytest.fixture(scope="function")
def make_auth_headers(db_session):
    def _make(username: str, role: str):
        existing = db_session.query(User).filter(User.username == username).first()
        if not existing:
            user = User(
                username=username,
                email=f"{username}@cris.test",
                full_name=f"Test {role}",
                hashed_password=hash_password("TestPass123!"),
                role=role,
                is_active=True,
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)
        else:
            user = existing
        token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
        return {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture(scope="function")
def unauth_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(db_session, make_auth_headers):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    headers = make_auth_headers("test_admin", "Administrator")
    with TestClient(app, raise_server_exceptions=True) as test_client:
        test_client.headers.update(headers)
        yield test_client
    app.dependency_overrides.clear()
