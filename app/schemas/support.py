from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class SupportTicketCreate(BaseModel):
    category: str = Field(..., description="Category, e.g. Privacy & Confidentiality, Escrow & Payments, Barter Swap, General Support")
    subject: str = Field(..., min_length=3, max_length=255, description="Brief subject of your inquiry")
    message: str = Field(..., min_length=10, description="Detailed description of the issue or question")
    contact_email: EmailStr = Field(..., description="Email address where we can reach you")
    priority: str = Field(default="NORMAL", description="NORMAL or URGENT")

class SupportTicketResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    category: str
    subject: str
    message: str
    contact_email: str
    status: str
    priority: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FAQItem(BaseModel):
    question: str
    answer: str
    category: str

