from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserPublic

class InterviewQuestionBase(BaseModel):
    company_name: str = Field(..., description="e.g. Google, Amazon, Microsoft, TCS, Infosys")
    role: str = Field(..., description="e.g. Software Engineer, SDE-1, Cloud Architect")
    category: str = Field(..., description="e.g. Data Structures, System Design, SQL, OOP, Behavioral")
    round_type: str = Field(..., description="e.g. Technical Round 1, System Design, Training Assessment")
    difficulty: str = Field("Medium", description="Easy, Medium, Hard")
    question_text: str
    answer_explanation: str
    tags: Optional[str] = Field(None, description="Comma-separated tags (e.g. python, arrays, dynamic-programming)")

class InterviewQuestionCreate(InterviewQuestionBase):
    pass

class InterviewQuestionUpdate(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    category: Optional[str] = None
    round_type: Optional[str] = None
    difficulty: Optional[str] = None
    question_text: Optional[str] = None
    answer_explanation: Optional[str] = None
    tags: Optional[str] = None

class InterviewQuestionResponse(InterviewQuestionBase):
    id: int
    upvotes_count: int
    author_id: Optional[int] = None
    created_at: datetime
    author: Optional[UserPublic] = None

    model_config = ConfigDict(from_attributes=True)

class QuestionVoteResponse(BaseModel):
    question_id: int
    upvotes_count: int
    user_voted: bool
