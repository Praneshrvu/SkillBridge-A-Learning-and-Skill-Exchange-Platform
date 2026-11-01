from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserPublic
from app.schemas.skill import SkillResponse

class ExchangeCreate(BaseModel):
    receiver_id: int = Field(..., description="Target teacher or peer user ID")
    exchange_type: str = Field(
        "BARTER", 
        description="Exchange mode: 'BARTER' (skill-for-skill), 'PAID_ONE_WAY' (learner pays teacher), 'FREE' (voluntary)"
    )
    sender_offered_skill_id: Optional[int] = Field(None, description="Skill sender offers to teach (e.g. C++)")
    receiver_requested_skill_id: Optional[int] = Field(None, description="Skill sender wants to learn (e.g. Java)")
    monetary_amount: float = Field(0.0, description="Agreed or demanded fee (0 for barter or free)")
    currency: str = "USD"
    session_details: Optional[str] = Field(None, description="Proposal, goals, preferred time/meeting link")

class ExchangeStatusUpdate(BaseModel):
    status: str = Field(..., description="'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'")

class PaymentAction(BaseModel):
    action: str = Field(..., description="'PAY_ESCROW', 'RELEASE_TO_TEACHER', 'REFUND'")
    payment_method: Optional[str] = Field("WALLET_SIMULATED", description="Simulated payment gateway / wallet")
    transaction_note: Optional[str] = None

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 stars")
    comment: Optional[str] = Field(None, description="Feedback about the session and explanation quality")

class ReviewResponse(BaseModel):
    id: int
    exchange_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExchangeResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    exchange_type: str
    sender_offered_skill_id: Optional[int] = None
    receiver_requested_skill_id: Optional[int] = None
    monetary_amount: float
    currency: str
    payment_status: str
    status: str
    session_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    sender: UserPublic
    receiver: UserPublic
    sender_offered_skill: Optional[SkillResponse] = None
    receiver_requested_skill: Optional[SkillResponse] = None
    reviews: List[ReviewResponse] = []

    model_config = ConfigDict(from_attributes=True)
