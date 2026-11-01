from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ExchangeRequest(Base):
    __tablename__ = "exchange_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Types:
    # 'BARTER': Skill for skill (e.g. sender teaches C++, receiver teaches Java)
    # 'PAID_ONE_WAY': Sender pays receiver for tutoring (or receiver sets fee)
    # 'MUTUAL_PAID': Paid professional consultation
    # 'FREE': Voluntary free knowledge exchange
    exchange_type = Column(String(30), nullable=False, default="BARTER")
    
    sender_offered_skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True) # Skill sender can teach
    receiver_requested_skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True) # Skill receiver teaches
    
    # Monetary details:
    # Requirement: "person can demand money for the teaching and the person can decide to pay or not"
    # "either pay each other or the person who explains it gets paid from the person getting explained or free barter"
    monetary_amount = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")
    
    # Payment status: NOT_APPLICABLE, PAYMENT_PENDING, PAID_ESCROW, RELEASED_TO_TEACHER, REFUNDED
    payment_status = Column(String(30), default="NOT_APPLICABLE")
    
    # Request lifecycle: PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED
    status = Column(String(30), default="PENDING", index=True)
    
    session_details = Column(Text, nullable=True) # Agenda, learning objectives, schedule link
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_exchanges")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_exchanges")
    sender_offered_skill = relationship("Skill", foreign_keys=[sender_offered_skill_id])
    receiver_requested_skill = relationship("Skill", foreign_keys=[receiver_requested_skill_id])
    reviews = relationship("Review", back_populates="exchange", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    exchange_id = Column(Integer, ForeignKey("exchange_requests.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    exchange = relationship("ExchangeRequest", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewee = relationship("User", foreign_keys=[reviewee_id])
