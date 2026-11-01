from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CompanyMentorProfile(Base):
    __tablename__ = "company_mentor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    company_name = Column(String(100), index=True, nullable=False) # e.g. Google, Microsoft, Amazon, Infosys, Meta
    job_title = Column(String(100), nullable=False) # e.g. Staff Software Engineer, Tech Lead
    department = Column(String(100), nullable=True) # e.g. Cloud Infrastructure, Search, Payments
    years_of_experience = Column(Float, default=0.0)
    
    can_give_referral = Column(Boolean, default=False)
    mock_interview_available = Column(Boolean, default=True)
    
    # Pricing: $0 for free AMA / questions, or demanded fee
    hourly_fee = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")
    
    topics_open_for_questions = Column(Text, nullable=True) # e.g. "System Design, L5 Interviews, Distributed Systems, Resume Critique"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="mentor_profile")

class DirectMentorQuestion(Base):
    __tablename__ = "direct_mentor_questions"

    id = Column(Integer, primary_key=True, index=True)
    mentor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asker_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    question_text = Column(Text, nullable=False)
    mentor_response = Column(Text, nullable=True)
    
    # Status: PENDING_REPLY, ANSWERED, CLOSED
    status = Column(String(30), default="PENDING_REPLY", index=True)
    
    # If private: only asker and mentor see it. If public: published for the whole community to learn!
    is_private = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    answered_at = Column(DateTime, nullable=True)

    mentor = relationship("User", foreign_keys=[mentor_user_id], back_populates="received_questions")
    asker = relationship("User", foreign_keys=[asker_user_id], back_populates="asked_questions")
