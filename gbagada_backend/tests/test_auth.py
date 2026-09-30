from conftest import make_user
from src.models.user import UserRole


def test_login_succeeds_with_correct_credentials(client, db):
    make_user(db, role=UserRole.MEMBER, email="realuser@example.com")
    db.commit()

    response = client.post(
        "/api/auth/login",
        data={"username": "realuser@example.com", "password": "TestPass123!"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_fails_with_wrong_password(client, db):
    make_user(db, role=UserRole.MEMBER, email="realuser2@example.com")
    db.commit()

    response = client.post(
        "/api/auth/login",
        data={"username": "realuser2@example.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401


def test_login_fails_for_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "nobody@example.com", "password": "AnyPassword123!"}
    )
    assert response.status_code == 401
