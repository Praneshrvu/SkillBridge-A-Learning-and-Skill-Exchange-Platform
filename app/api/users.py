from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.skill import UserSkill
from app.schemas.user import UserPublic
from app.schemas.skill import UserSkillResponse
from app.api.deps import get_current_user_optional

router = APIRouter(prefix="/users", tags=["Users & Confidential Profiles"])

@router.get("", response_model=List[UserPublic])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    confidential_only: Optional[bool] = Query(None, description="Filter for confidential profiles"),
    search: Optional[str] = Query(None, description="Search by display name or skill"),
    db: Session = Depends(get_db)
):
    """
    List user profiles with privacy protection.
    If a user has chosen confidentiality (`is_confidential = True`),
    their personal identity (full name, phone, email, bio) is automatically masked,
    and only their display name and teaching abilities are public.
    """
    query = db.query(User)
    
    if confidential_only is not None:
        query = query.filter(User.is_confidential == confidential_only)
        
    if search:
        query = query.filter(User.display_name.ilike(f"%{search}%"))
        
    users = query.offset(skip).limit(limit).all()
    return [UserPublic.from_orm_with_privacy(u) for u in users]

@router.get("/{user_id}", response_model=UserPublic)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get an individual user's profile.
    Confidentiality is strictly enforced unless the requester is the user themselves.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    # If the user is viewing their own profile, they see unmasked data
    if current_user and current_user.id == user.id:
        return UserPublic(
            id=user.id,
            display_name=user.display_name,
            is_confidential=user.is_confidential,
            full_name=user.full_name,
            bio=user.bio,
            company=user.company,
            job_title=user.job_title,
            avatar_url=user.avatar_url,
            is_company_verified=user.is_company_verified,
            created_at=user.created_at
        )
    
    return UserPublic.from_orm_with_privacy(user)

@router.get("/{user_id}/skills", response_model=List[UserSkillResponse])
def get_user_skills(
    user_id: int,
    skill_type: Optional[str] = Query(None, description="'TEACH' or 'LEARN'"),
    db: Session = Depends(get_db)
):
    """
    Returns the skills offered or desired by a user.
    Reveals what the person is good at explaining and their preferred exchange mode (Barter / Paid / Free).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    query = db.query(UserSkill).filter(UserSkill.user_id == user_id)
    if skill_type:
        query = query.filter(UserSkill.skill_type == skill_type.upper())
        
    return query.all()

