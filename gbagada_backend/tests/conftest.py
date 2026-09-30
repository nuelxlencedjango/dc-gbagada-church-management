"""
Shared test setup — a fresh, isolated test database for every test run,
plus helpers for creating test users of each role and getting them a
real auth token, matching exactly how the real app authenticates.

SAFETY: this is designed to run ONLY against a dedicated, throwaway test
database (default: ci_test_db) — never your real local dominion_church
database, and never production. It refuses to run at all if
TEST_DATABASE_URL looks like it points at a non-test database, since the
setup_database fixture below calls drop_all(), which would otherwise
destroy real data.

To use this: create a separate local Postgres database once, e.g.:
    createdb -U postgres ci_test_db
Then just run pytest — no env var needed unless you want a different
name/host, in which case set TEST_DATABASE_URL yourself (as long as it
contains "test" somewhere in the database name).
"""
import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("SECRET_KEY", "test_only_secret_key_never_use_in_production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ci_test_db"
)

# Hard safety check: refuse to run against anything that isn't clearly a
# throwaway test database. This is what should have been here from the
# start — it would have stopped the earlier dominion_church incident
# before drop_all() ever got a chance to run.
_db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?", 1)[0]
if "test" not in _db_name.lower():
    sys.exit(
        f"\n\nRefusing to run tests against database '{_db_name}'.\n"
        f"TEST_DATABASE_URL must point at a dedicated throwaway test "
        f"database (its name must contain 'test'), because these tests "
        f"call drop_all() on it. Create one once with:\n"
        f"    createdb -U postgres ci_test_db\n"
        f"and either unset TEST_DATABASE_URL to use that default, or set "
        f"it to a URL whose database name contains 'test'.\n"
    )

from src.config.database import Base, get_db
from src.main import app
from src.models.user import User, UserRole
from src.models.department import Department, DepartmentActivity
from src.models.cell import Cell, CellActivity
from src.models.member import Member
from src.services.auth import AuthService
from fastapi.testclient import TestClient
from datetime import date

# Import every model module so Base.metadata knows about every table —
# without this, drop_all() only drops the subset of tables whose models
# happen to already be imported above, and errors out on foreign keys
# from tables it doesn't know about (this was the actual cause of the
# "training_sessions depends on users" failure).
import src.models
import src.models.budget

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Creates every table once for the whole test run, drops them all
    when finished. Safe specifically because the guard above already
    confirmed this can only be a dedicated test database."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """A fresh session per test, wrapped in a transaction that's always
    rolled back afterward — so tests never leak data into each other,
    without needing to recreate every table for every single test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """A FastAPI test client wired to use the SAME transactional test
    session as the db fixture, instead of a real production connection."""
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def make_user(db, role=UserRole.MEMBER, email="test@example.com", full_name="Test User"):
    """Creates a real User row with a real hashed password, matching
    exactly how the app itself creates users."""
    auth_service = AuthService(db)
    user = User(
        email=email,
        hashed_password=auth_service.get_password_hash("TestPass123!"),
        full_name=full_name,
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


def auth_headers_for(db, user):
    """A real, valid JWT for this user, in the same format every
    protected endpoint expects — Authorization: Bearer <token>."""
    auth_service = AuthService(db)
    token = auth_service.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"Authorization": f"Bearer {token}"}