from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.skill import Skill, UserSkill
from app.models.user import User
from app.schemas.skill import (
    SkillCreate, SkillResponse, UserSkillCreate,
    UserSkillResponse, UserSkillUpdate, TeacherCatalogItem
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/skills", tags=["Skills & Teaching Catalog"])

@router.get("", response_model=List[SkillResponse])
def list_master_skills(
    category: Optional[str] = Query(None, description="Filter by category e.g. Programming, Cloud, System Design"),
    search: Optional[str] = Query(None, description="Search skill by name"),
    db: Session = Depends(get_db)
):
    """
    List master skills available on SkillBridge.
    """
    query = db.query(Skill)
    if category:
        query = query.filter(Skill.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(Skill.name.ilike(f"%{search}%"))
    return query.order_by(Skill.name.asc()).all()

@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_master_skill(
    skill_in: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a new master skill to the platform repository.
    """
    existing = db.query(Skill).filter(Skill.name.ilike(skill_in.name)).first()
    if existing:
        return existing
    
    skill = Skill(
        name=skill_in.name,
        category=skill_in.category,
        description=skill_in.description
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill

@router.get("/catalog", response_model=List[TeacherCatalogItem])
def browse_teacher_catalog(
    skill_id: Optional[int] = Query(None, description="Filter by specific skill"),
    skill_name: Optional[str] = Query(None, description="Filter by skill name keyword"),
    exchange_mode: Optional[str] = Query(None, description="'BARTER_ONLY', 'PAID_ONLY', 'BOTH', 'VOLUNTEER_FREE'"),
    max_price: Optional[float] = Query(None, description="Maximum hourly fee demanded"),
    confidential_only: Optional[bool] = Query(None, description="Filter for anonymous mentors"),
    db: Session = Depends(get_db)
):
    """
    Browse teachers, mentors, and peers willing to teach.
    Shows what they can teach, how good they are at explaining, their rates, and exchange preference.
    Respects user confidentiality: confidential users show alias/display name only.
    """
    query = (
        db.query(UserSkill, User, Skill)
        .join(User, UserSkill.user_id == User.id)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.skill_type == "TEACH")
    )

    if skill_id:
        query = query.filter(UserSkill.skill_id == skill_id)
    if skill_name:
        query = query.filter(Skill.name.ilike(f"%{skill_name}%"))
    if exchange_mode:
        query = query.filter(
            or_(
                UserSkill.exchange_preference == exchange_mode,
                UserSkill.exchange_preference == "BOTH"
            )
        )
    if max_price is not None:
        query = query.filter(UserSkill.hourly_rate <= max_price)
    if confidential_only is not None:
        query = query.filter(User.is_confidential == confidential_only)

    results = query.all()
    catalog: List[TeacherCatalogItem] = []

    for user_skill, user, skill in results:
        company_display = None if user.is_confidential else user.company
        catalog.append(
            TeacherCatalogItem(
                user_skill_id=user_skill.id,
                user_id=user.id,
                display_name=user.display_name,
                is_confidential=user.is_confidential,
                company=company_display,
                skill_name=skill.name,
                category=skill.category,
                proficiency_level=user_skill.proficiency_level,
                explanation_style=user_skill.explanation_style,
                years_of_experience=user_skill.years_of_experience,
                exchange_preference=user_skill.exchange_preference,
                hourly_rate=user_skill.hourly_rate,
                currency=user_skill.currency
            )
        )
    return catalog

@router.get("/my-skills", response_model=List[UserSkillResponse])
def get_my_skills(
    skill_type: Optional[str] = Query(None, description="'TEACH' or 'LEARN'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List skills that the logged-in user can teach or wants to learn.
    """
    query = db.query(UserSkill).filter(UserSkill.user_id == current_user.id)
    if skill_type:
        query = query.filter(UserSkill.skill_type == skill_type.upper())
    return query.all()

@router.post("/my-skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
def add_my_skill(
    skill_in: UserSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a skill to teach (with explanation style & hourly rate) or a skill you want to learn.
    """
    skill = db.query(Skill).filter(Skill.id == skill_in.skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    
    # Check if duplicate
    existing = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == skill_in.skill_id,
        UserSkill.skill_type == skill_in.skill_type.upper()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already listed '{skill.name}' under '{skill_in.skill_type}'."
        )

    user_skill = UserSkill(
        user_id=current_user.id,
        skill_id=skill_in.skill_id,
        skill_type=skill_in.skill_type.upper(),
        proficiency_level=skill_in.proficiency_level,
        explanation_style=skill_in.explanation_style,
        years_of_experience=skill_in.years_of_experience,
        exchange_preference=skill_in.exchange_preference,
        hourly_rate=skill_in.hourly_rate,
        currency=skill_in.currency
    )
    db.add(user_skill)
    db.commit()
    db.refresh(user_skill)
    return user_skill

@router.delete("/my-skills/{user_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_skill(
    user_skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a skill from your profile.
    """
    user_skill = db.query(UserSkill).filter(
        UserSkill.id == user_skill_id,
        UserSkill.user_id == current_user.id
    ).first()
    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill listing not found.")
    
    db.delete(user_skill)
    db.commit()
    return None

@router.get("/match")
def find_barter_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Smart 2-Way Barter Matcher:
    Finds peer users where:
    - They teach what YOU want to learn.
    - AND they want to learn what YOU can teach!
    Example: You know C++ and want to learn Java.
             Another person knows Java and wants to learn C++.
             This endpoint highlights them as a 100% Mutual Barter match!
    """
    my_teach_skills = db.query(UserSkill.skill_id).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_type == "TEACH"
    ).all()
    my_teach_ids = [s[0] for s in my_teach_skills]

    my_learn_skills = db.query(UserSkill.skill_id).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_type == "LEARN"
    ).all()
    my_learn_ids = [s[0] for s in my_learn_skills]

    if not my_teach_ids or not my_learn_ids:
        return {
            "message": "Add at least one skill you can TEACH and one skill you want to LEARN to discover barter matches.",
            "matches": []
        }

    # Find peers who teach what I want to learn
    peers_teach = (
        db.query(UserSkill)
        .filter(
            UserSkill.user_id != current_user.id,
            UserSkill.skill_type == "TEACH",
            UserSkill.skill_id.in_(my_learn_ids)
        )
        .all()
    )

    matches = []
    for pt in peers_teach:
        peer_id = pt.user_id
        # Check if this peer wants to learn something I can teach
        peer_learns = (
            db.query(UserSkill)
            .filter(
                UserSkill.user_id == peer_id,
                UserSkill.skill_type == "LEARN",
                UserSkill.skill_id.in_(my_teach_ids)
            )
            .first()
        )
        
        if peer_learns:
            peer_user = db.query(User).filter(User.id == peer_id).first()
            i_learn_skill = db.query(Skill).filter(Skill.id == pt.skill_id).first()
            peer_learns_skill = db.query(Skill).filter(Skill.id == peer_learns.skill_id).first()

            matches.append({
                "peer_user_id": peer_id,
                "peer_display_name": peer_user.display_name,
                "is_confidential": peer_user.is_confidential,
                "peer_teaches": i_learn_skill.name,
                "peer_explanation_style": pt.explanation_style,
                "peer_wants_to_learn": peer_learns_skill.name,
                "match_type": "PERFECT_MUTUAL_BARTER",
                "recommended_exchange": f"You teach {peer_learns_skill.name} in exchange for learning {i_learn_skill.name} (0$ Barter)"
            })

    return {"count": len(matches), "matches": matches}
