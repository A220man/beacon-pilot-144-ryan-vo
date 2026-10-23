import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.core.database import db, get_db
from app.models import Base, User, Role


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_db):
    app = create_app()

    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"test-sub-{unique_id}",
        username=f"testuser-{unique_id}",
        email=f"test-{unique_id}@example.com",
        role=Role.OPERATOR,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(test_db):
    import uuid
    unique_id = uuid.uuid4().hex[:8]
    user = User(
        keycloak_sub=f"admin-sub-{unique_id}",
        username=f"adminuser-{unique_id}",
        email=f"admin-{unique_id}@example.com",
        role=Role.ADMIN,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user

