from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), index=True, nullable=False) # e.g. Google, Amazon, Microsoft, TCS, Infosys
    role = Column(String(100), index=True, nullable=False) # e.g. Software Engineer, Backend Dev, Cloud Engineer
    category = Column(String(100), index=True, nullable=False) # e.g. Data Structures, System Design, SQL, OOP
    round_type = Column(String(100), nullable=False) # e.g. Technical Round 1, System Design, Corporate Training Assessment
    difficulty = Column(String(30), nullable=False, default="Medium") # Easy, Medium, Hard
    
    question_text = Column(Text, nullable=False)
    answer_explanation = Column(Text, nullable=False) # Detailed solution & explanation
    tags = Column(String(255), nullable=True) # e.g. "binary-tree, recursion, complexity"
    upvotes_count = Column(Integer, default=0)
    
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="contributed_questions")
    votes = relationship("QuestionVote", back_populates="question", cascade="all, delete-orphan")

class QuestionVote(Base):
    __tablename__ = "question_votes"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vote_type = Column(Integer, default=1) # +1
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("question_id", "user_id", name="uq_question_user_vote"),
    )

    question = relationship("InterviewQuestion", back_populates="votes")
    user = relationship("User")
