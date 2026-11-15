from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="SYSTEM", index=True)
    # Types: EXCHANGE_REQUEST, EXCHANGE_ACCEPTED, EXCHANGE_REJECTED, PAYMENT_ESCROW, SESSION_COMPLETED, NEW_MESSAGE, SYSTEM
    
    link_tab = Column(String(50), nullable=True) # e.g. tab-exchanges, tab-chat, tab-videos
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="notifications")
