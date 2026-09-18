from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# pool_pre_ping tests each connection with a lightweight query before
# actually using it, transparently discarding and replacing any that
# have gone stale — essential for a serverless database like Neon,
# which suspends its compute after inactivity and can leave the
# connection pool holding dead connections that look fine until used.
# pool_recycle proactively refreshes connections older than 5 minutes,
# reducing how often a stale one is even encountered in the first place.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()