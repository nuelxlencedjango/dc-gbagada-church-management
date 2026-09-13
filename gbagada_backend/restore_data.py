from src.config.database import SessionLocal
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.cell import Cell
from src.models.department import Department
from src.services.auth import AuthService
from datetime import date

def restore_data():
    db = SessionLocal()
    auth = AuthService(db)
    
    print("🔄 Restoring database data...")
    
    # 1. Create Super Admin
    admin = db.query(User).filter(User.email == 'admin@dominioncitygbagada.com').first()
    if not admin:
        admin = User(
            email='admin@dominioncitygbagada.com',
            hashed_password=auth.get_password_hash('Admin@123'),
            full_name='Super Admin',
            role=UserRole.SUPER_ADMIN,
            is_verified=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("✅ Super admin created")
    
    # 2. Create sample members
    members_data = [
        {'first_name': 'Joshua', 'last_name': 'Mike', 'email': 'joshua@church.com', 'phone_number': '08012345678'},
        {'first_name': 'Kate', 'last_name': 'Tinubu', 'email': 'kate@church.com', 'phone_number': '08087654321'},
        {'first_name': 'James', 'last_name': 'Agbo', 'email': 'james@church.com', 'phone_number': '08098765432'},
        {'first_name': 'Mary', 'last_name': 'John', 'email': 'mary@church.com', 'phone_number': '08034567890'},
    ]
    
    for m in members_data:
        existing = db.query(Member).filter(Member.email == m['email']).first()
        if not existing:
            member = Member(
                first_name=m['first_name'],
                last_name=m['last_name'],
                email=m['email'],
                phone_number=m['phone_number'],
                membership_status='active',
                member_since=date.today()
            )
            db.add(member)
    db.commit()
    print("✅ Members created")
    
    # 3. Create sample cells
    cells_data = [
        {'name': 'Ifako', 'description': 'managing church groups in small unit', 'meeting_day': 'Sunday', 'meeting_time': '6:pm', 'meeting_location': '3 Mako way'},
        {'name': 'Bariga 1', 'description': 'Small unit church management', 'meeting_day': 'Saturday', 'meeting_time': '5:pm', 'meeting_location': '20 Tinubu way, Bariga'},
        {'name': 'Oworor', 'description': 'Small unity church management', 'meeting_day': 'Wednesday', 'meeting_time': '4:30pm', 'meeting_location': '4 M. Buhari way'},
        {'name': 'Obalende', 'description': 'Small unit', 'meeting_day': 'Sunday', 'meeting_time': '6:pm', 'meeting_location': '4 tina way'},
    ]
    
    for c in cells_data:
        existing = db.query(Cell).filter(Cell.name == c['name']).first()
        if not existing:
            cell = Cell(**c)
            db.add(cell)
    db.commit()
    print("✅ Cells created")
    
    # 4. Create sample departments
    depts_data = [
        {'name': 'Ushering', 'description': 'Organize and manage church services'},
        {'name': 'Media', 'description': 'Projecting the activities of the church to the society'},
        {'name': 'Children Ministry', 'description': 'Grooming the younger generation to know Christ'},
        {'name': 'Choir', 'description': 'Sing and arrange for musical events'},
    ]
    
    for d in depts_data:
        existing = db.query(Department).filter(Department.name == d['name']).first()
        if not existing:
            dept = Department(**d)
            db.add(dept)
    db.commit()
    print("✅ Departments created")
    
    print("🎉 Database restored successfully!")
    db.close()

if __name__ == "__main__":
    restore_data()
