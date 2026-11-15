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
    
    # CONFIDENTIALITY / ANONYMITY FEATURES:
    # 1. Master confidentiality toggle
    is_confidential = Column(Boolean, default=False, nullable=False)
    
    # 2. Specific option for person creating profile to TEACH (confidential vs public)
    is_confidential_teacher = Column(Boolean, default=False, nullable=False)
    
    # 3. Specific option for person who wants to get TAUGHT / LEARN (confidential vs public)
    is_confidential_learner = Column(Boolean, default=False, nullable=False)

    # 4. Granular personal detail visibility controls (phone, email, real name, company)
    # Allows teachers & learners to specifically decide whether to show or hide their phone, email, or real identity
    show_phone = Column(Boolean, default=False, nullable=False) # Hidden by default
    show_email = Column(Boolean, default=False, nullable=False) # Hidden by default
    show_real_name = Column(Boolean, default=True, nullable=False)
    show_company = Column(Boolean, default=True, nullable=False)
    
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
    
    # Direct Chat & Community Lounge Relationships
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("ChatMessage", foreign_keys="ChatMessage.receiver_id", back_populates="receiver", cascade="all, delete-orphan")
    community_messages = relationship("CommunityMessage", back_populates="sender", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan", order_by="desc(Notification.created_at)")
