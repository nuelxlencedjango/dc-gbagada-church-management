from datetime import date
from conftest import make_user
from src.models.user import UserRole
from src.models.department import Department, DepartmentActivity
from src.models.cell import Cell, CellActivity
from src.api.routes.ai import _build_restricted_context, _build_cell_restricted_context

USHERING_CHALLENGE = "UNIQUE_USHERING_UNIFORM_ISSUE_TEXT"
MEDIA_CHALLENGE = "UNIQUE_MEDIA_CAMERA_ISSUE_TEXT"
IFAKO_CHALLENGE = "UNIQUE_IFAKO_LATE_COMING_TEXT"
OBALENDE_CHALLENGE = "UNIQUE_OBALENDE_TRANSPORT_TEXT"


def _setup_two_departments(db):
    alice = make_user(db, role=UserRole.DEPARTMENT_HEAD, email="alice@example.com", full_name="Alice Usher")
    bob = make_user(db, role=UserRole.DEPARTMENT_HEAD, email="bob@example.com", full_name="Bob Media")
    db.flush()

    ushering = Department(name="Ushering", is_active=True, head_id=alice.id)
    media = Department(name="Media", is_active=True, head_id=bob.id)
    db.add_all([ushering, media])
    db.flush()

    db.add(DepartmentActivity(
        department_id=ushering.id, week_start_date=date.today(),
        challenges=USHERING_CHALLENGE, achievements="10 ushers served"
    ))
    db.add(DepartmentActivity(
        department_id=media.id, week_start_date=date.today(),
        challenges=MEDIA_CHALLENGE, achievements="Livestream improved"
    ))
    db.commit()
    return alice, bob


def test_department_head_sees_only_own_department_challenges(db):
    alice, bob = _setup_two_departments(db)

    alice_context = _build_restricted_context(db, alice)
    assert USHERING_CHALLENGE in alice_context
    assert MEDIA_CHALLENGE not in alice_context

    bob_context = _build_restricted_context(db, bob)
    assert MEDIA_CHALLENGE in bob_context
    assert USHERING_CHALLENGE not in bob_context


def test_admin_sees_all_department_challenges(db):
    _setup_two_departments(db)
    admin = make_user(db, role=UserRole.SUPER_ADMIN, email="admin@example.com")
    db.commit()

    admin_context = _build_restricted_context(db, admin)
    assert USHERING_CHALLENGE in admin_context
    assert MEDIA_CHALLENGE in admin_context


def test_plain_member_sees_no_department_reports(db):
    _setup_two_departments(db)
    plain_member = make_user(db, role=UserRole.MEMBER, email="plainmember@example.com")
    db.commit()

    member_context = _build_restricted_context(db, plain_member)
    assert USHERING_CHALLENGE not in member_context
    assert MEDIA_CHALLENGE not in member_context


def _setup_two_cells(db):
    mira = make_user(db, role=UserRole.CELL_LEADER, email="mira@example.com", full_name="Mira Bode")
    paul = make_user(db, role=UserRole.CELL_LEADER, email="paul@example.com", full_name="Paul Leader")
    db.flush()

    ifako = Cell(name="Ifako", is_active=True, leader_id=mira.id)
    obalende = Cell(name="Obalende", is_active=True, leader_id=paul.id)
    db.add_all([ifako, obalende])
    db.flush()

    db.add(CellActivity(
        cell_id=ifako.id, week_start_date=date.today(),
        challenges=IFAKO_CHALLENGE, attendance=12
    ))
    db.add(CellActivity(
        cell_id=obalende.id, week_start_date=date.today(),
        challenges=OBALENDE_CHALLENGE, attendance=8
    ))
    db.commit()
    return mira, paul


def test_cell_leader_sees_only_own_cell_challenges(db):
    mira, paul = _setup_two_cells(db)

    mira_context = _build_cell_restricted_context(db, mira)
    assert IFAKO_CHALLENGE in mira_context
    assert OBALENDE_CHALLENGE not in mira_context

    paul_context = _build_cell_restricted_context(db, paul)
    assert OBALENDE_CHALLENGE in paul_context
    assert IFAKO_CHALLENGE not in paul_context


def test_admin_sees_all_cell_challenges(db):
    _setup_two_cells(db)
    admin = make_user(db, role=UserRole.SUPER_ADMIN, email="admin2@example.com")
    db.commit()

    admin_context = _build_cell_restricted_context(db, admin)
    assert IFAKO_CHALLENGE in admin_context
    assert OBALENDE_CHALLENGE in admin_context


def test_plain_member_sees_no_cell_reports(db):
    _setup_two_cells(db)
    plain_member = make_user(db, role=UserRole.MEMBER, email="plainmember2@example.com")
    db.commit()

    member_context = _build_cell_restricted_context(db, plain_member)
    assert IFAKO_CHALLENGE not in member_context
    assert OBALENDE_CHALLENGE not in member_context
