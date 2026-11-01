from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False, index=True) # Public handle / alias
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    company = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    is_company_verified = Column(Boolean, default=False)
    
    # CONFIDENTIALITY / ANONYMITY FEATURE:
    # If True: only display_name and what they can teach / explain are visible publicly.
    # Email, phone, full_name, company, and personal contact details are completely masked.
    is_confidential = Column(Boolean, default=False, nullable=False)
    
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user_skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    sent_exchanges = relationship("ExchangeRequest", foreign_keys="ExchangeRequest.sender_id", back_populates="sender")
    received_exchanges = relationship("ExchangeRequest", foreign_keys="ExchangeRequest.receiver_id", back_populates="receiver")
    contributed_questions = relationship("InterviewQuestion", back_populates="author")
    mentor_profile = relationship("CompanyMentorProfile", back_populates="user", uselist=False)
    asked_questions = relationship("DirectMentorQuestion", foreign_keys="DirectMentorQuestion.asker_user_id", back_populates="asker")
    received_questions = relationship("DirectMentorQuestion", foreign_keys="DirectMentorQuestion.mentor_user_id", back_populates="mentor")
