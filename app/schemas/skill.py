from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class SkillBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserSkillCreate(BaseModel):
    skill_id: int
    skill_type: str = Field("TEACH", description="'TEACH' or 'LEARN'")
    is_confidential: bool = Field(False, description="Option to keep identity confidential for this specific teaching or learning profile")
    proficiency_level: str = Field("INTERMEDIATE", description="'BEGINNER', 'INTERMEDIATE', 'ADVANCED', or 'EXPERT'")
    explanation_style: Optional[str] = Field(None, description="For Teachers: What you are good at explaining, analogies, live coding style")
    learning_goal: Optional[str] = Field(None, description="For Learners: What you want to understand, get explained, or your target goals")
    years_of_experience: float = 0.0
    exchange_preference: str = Field("BOTH", description="'BARTER_ONLY', 'PAID_ONLY', 'BOTH', 'VOLUNTEER_FREE'")
    hourly_rate: float = Field(0.0, description="Fee demanded for teaching, or 0.0 for barter/free")
    currency: str = "USD"

class UserSkillUpdate(BaseModel):
    proficiency_level: Optional[str] = None
    explanation_style: Optional[str] = None
    learning_goal: Optional[str] = None
    is_confidential: Optional[bool] = None
    years_of_experience: Optional[float] = None
    exchange_preference: Optional[str] = None
    hourly_rate: Optional[float] = None
    currency: Optional[str] = None

class UserSkillResponse(BaseModel):
    id: int
    user_id: int
    skill_id: int
    skill_type: str
    is_confidential: bool = False
    proficiency_level: str
    explanation_style: Optional[str] = None
    learning_goal: Optional[str] = None
    years_of_experience: float
    exchange_preference: str
    hourly_rate: float
    currency: str
    created_at: datetime
    skill: SkillResponse

    model_config = ConfigDict(from_attributes=True)

class SkillCatalogItem(BaseModel):
    user_skill_id: int
    user_id: int
    skill_type: str # 'TEACH' (teacher offering to teach) or 'LEARN' (learner wanting to be taught)
    display_name: str
    is_confidential: bool
    full_name: Optional[str] = None # Masked if is_confidential is True
    company: Optional[str] = None   # Masked if is_confidential is True
    bio: Optional[str] = None       # Masked if is_confidential is True
    skill_name: str
    category: str
    proficiency_level: str
    explanation_style: Optional[str] = None
    learning_goal: Optional[str] = None
    years_of_experience: float
    exchange_preference: str
    hourly_rate: float
    currency: str

# Backward compatibility alias
TeacherCatalogItem = SkillCatalogItem
