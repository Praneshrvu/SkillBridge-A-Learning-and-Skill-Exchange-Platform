from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserPublic

class ChatMessageCreate(BaseModel):
    receiver_id: int = Field(..., description="ID of the teacher, learner, or peer to message")
    content: str = Field(..., min_length=1, description="Message text content")

class ChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender: UserPublic
    receiver: UserPublic

    model_config = ConfigDict(from_attributes=True)

class ConversationSummary(BaseModel):
    other_user: UserPublic
    last_message: str
    last_message_time: datetime
    unread_count: int

    model_config = ConfigDict(from_attributes=True)

class CommunityMessageCreate(BaseModel):
    channel: str = Field(default="general", description="Channel name, e.g. general, code-and-tech, interview-prep, barter-hub")
    content: str = Field(..., min_length=1, description="Message text content")

class CommunityMessageResponse(BaseModel):
    id: int
    sender_id: int
    channel: str
    content: str
    created_at: datetime
    sender: UserPublic

    model_config = ConfigDict(from_attributes=True)

class ChatUserDirectoryItem(BaseModel):
    id: int
    display_name: str
    is_confidential: bool
    bio: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    show_phone: bool = False
    show_email: bool = False
    teaching_skills: List[str] = []
    learning_skills: List[str] = []
    is_mentor: bool = False
    mentor_company: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
