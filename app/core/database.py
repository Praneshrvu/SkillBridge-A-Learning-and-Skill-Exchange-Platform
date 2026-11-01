import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("skillbridge.database")
logging.basicConfig(level=logging.INFO)

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("mysql"):
            # Test MySQL connection
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            # Try a lightweight connection
            with engine.connect() as conn:
                logger.info("Successfully connected to MySQL database.")
            return engine
        else:
            return create_engine(
                db_url,
                connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
            )
    except Exception as exc:
        if settings.FALLBACK_TO_SQLITE:
            fallback_url = "sqlite:///./skillbridge.db"
            logger.warning(
                f"Could not connect to configured database at '{db_url}' ({exc}). "
                f"Falling back to local SQLite database at '{fallback_url}'."
            )
            return create_engine(fallback_url, connect_args={"check_same_thread": False})
        raise exc

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI dependency yielding a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
