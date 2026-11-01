from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False) # e.g. Programming, Cloud, Interview, Design
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user_skills = relationship("UserSkill", back_populates="skill")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    
    # TEACH (user offers to teach) or LEARN (user wants to learn)
    skill_type = Column(String(20), nullable=False, default="TEACH") # TEACH or LEARN
    
    proficiency_level = Column(String(30), nullable=False, default="INTERMEDIATE") # BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    
    # Requirement: "what they can teach or is good at explaining be visible"
    explanation_style = Column(Text, nullable=True) # e.g. "Good at explaining from scratch with visual analogies and live code"
    years_of_experience = Column(Float, default=0.0)
    
    # Exchange Preference:
    # BARTER_ONLY: Wants to learn another skill in return (e.g. C++ for Java)
    # PAID_ONLY: Demands payment for teaching session
    # BOTH: Open to either skill barter or cash payment
    # VOLUNTEER_FREE: Free community mentorship
    exchange_preference = Column(String(30), default="BOTH")
    
    # If demanding money:
    hourly_rate = Column(Float, default=0.0) # $0 for free/barter, or positive number
    currency = Column(String(10), default="USD")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="user_skills")
    skill = relationship("Skill", back_populates="user_skills")
