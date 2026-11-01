from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserPublic

class CompanyMentorProfileCreate(BaseModel):
    company_name: str = Field(..., description="e.g. Google, Amazon, Microsoft, Infosys")
    job_title: str = Field(..., description="e.g. Senior Software Engineer")
    department: Optional[str] = None
    years_of_experience: float = 1.0
    can_give_referral: bool = False
    mock_interview_available: bool = True
    hourly_fee: float = Field(0.0, description="0.0 for free Q&A/AMA, or fee demanded for mock interview/teaching")
    currency: str = "USD"
    topics_open_for_questions: Optional[str] = Field(None, description="Topics open for direct questions")

class CompanyMentorProfileResponse(CompanyMentorProfileCreate):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)

class DirectQuestionCreate(BaseModel):
    mentor_user_id: int
    title: str = Field(..., description="Summary of the question or advice request")
    question_text: str = Field(..., description="Detailed question for the company professional")
    is_private: bool = Field(False, description="If true, only you and mentor see it; if false, visible publicly")

class DirectQuestionReply(BaseModel):
    mentor_response: str = Field(..., description="Professional's direct answer / guidance")

class DirectQuestionResponse(BaseModel):
    id: int
    mentor_user_id: int
    asker_user_id: int
    title: str
    question_text: str
    mentor_response: Optional[str] = None
    status: str
    is_private: bool
    created_at: datetime
    answered_at: Optional[datetime] = None
    mentor: UserPublic
    asker: UserPublic

    model_config = ConfigDict(from_attributes=True)
