from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(100), nullable=False) # "Privacy & Confidentiality", "Escrow & Payments", "Barter Swap", "General Support"
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    contact_email = Column(String(255), nullable=False)
    status = Column(String(50), default="OPEN", nullable=False) # OPEN, IN_PROGRESS, RESOLVED
    priority = Column(String(50), default="NORMAL", nullable=False) # NORMAL, URGENT
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", backref="support_tickets")

