from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    display_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    is_confidential: bool = False
    avatar_url: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password with minimum 6 characters")
    full_name: str
    display_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    is_confidential: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    is_confidential: Optional[bool] = None
    avatar_url: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    display_name: str
    is_confidential: bool

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# Public Profile Schema with Privacy/Confidentiality Protection
class UserPublic(BaseModel):
    id: int
    display_name: str
    is_confidential: bool
    
    # Sensitive fields are None or masked if is_confidential is True
    full_name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    is_company_verified: bool = False
    created_at: datetime

    @classmethod
    def from_orm_with_privacy(cls, user_obj):
        """
        Enforces user confidentiality:
        If user_obj.is_confidential is True, hides full_name, email, phone, company, and bio.
        Only display_name and what they can teach remain public!
        """
        if user_obj.is_confidential:
            return cls(
                id=user_obj.id,
                display_name=user_obj.display_name,
                is_confidential=True,
                full_name=None, # Hidden
                bio="[Confidential Mentor Profile - Details hidden by user choice]",
                company=None, # Hidden
                job_title=None, # Hidden
                avatar_url=None,
                is_company_verified=user_obj.is_company_verified,
                created_at=user_obj.created_at
            )
        return cls(
            id=user_obj.id,
            display_name=user_obj.display_name,
            is_confidential=False,
            full_name=user_obj.full_name,
            bio=user_obj.bio,
            company=user_obj.company,
            job_title=user_obj.job_title,
            avatar_url=user_obj.avatar_url,
            is_company_verified=user_obj.is_company_verified,
            created_at=user_obj.created_at
        )

# Private view for the owner of the profile
class UserMe(UserBase):
    id: int
    is_company_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
