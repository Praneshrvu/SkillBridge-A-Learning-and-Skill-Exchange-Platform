from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.company_mentor import CompanyMentorProfile, DirectMentorQuestion
from app.models.user import User
from app.schemas.company_mentor import (
    CompanyMentorProfileCreate, CompanyMentorProfileResponse,
    DirectQuestionCreate, DirectQuestionReply, DirectQuestionResponse
)
from app.schemas.user import UserPublic
from app.api.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/company-mentors", tags=["Company Mentors & Direct Professional Q&A"])

def build_mentor_profile_response(mp: CompanyMentorProfile) -> CompanyMentorProfileResponse:
    user_pub = UserPublic.from_orm_with_privacy(mp.user)
    return CompanyMentorProfileResponse(
        id=mp.id,
        user_id=mp.user_id,
        company_name=mp.company_name,
        job_title=mp.job_title,
        department=mp.department,
        years_of_experience=mp.years_of_experience,
        can_give_referral=mp.can_give_referral,
        mock_interview_available=mp.mock_interview_available,
        hourly_fee=mp.hourly_fee,
        currency=mp.currency,
        topics_open_for_questions=mp.topics_open_for_questions,
        is_active=mp.is_active,
        created_at=mp.created_at,
        user=user_pub
    )

def build_direct_question_response(dq: DirectMentorQuestion) -> DirectQuestionResponse:
    mentor_pub = UserPublic.from_orm_with_privacy(dq.mentor)
    asker_pub = UserPublic.from_orm_with_privacy(dq.asker)
    return DirectQuestionResponse(
        id=dq.id,
        mentor_user_id=dq.mentor_user_id,
        asker_user_id=dq.asker_user_id,
        title=dq.title,
        question_text=dq.question_text,
        mentor_response=dq.mentor_response,
        status=dq.status,
        is_private=dq.is_private,
        created_at=dq.created_at,
        answered_at=dq.answered_at,
        mentor=mentor_pub,
        asker=asker_pub
    )

@router.get("", response_model=List[CompanyMentorProfileResponse])
def list_company_mentors(
    company: Optional[str] = Query(None, description="Filter by company name e.g. Google, Amazon, Infosys"),
    free_only: Optional[bool] = Query(None, description="Filter for free mentorship / AMA ($0 fee)"),
    max_fee: Optional[float] = Query(None, description="Max hourly fee demanded"),
    can_refer: Optional[bool] = Query(None, description="Filter for mentors who can provide company referrals"),
    db: Session = Depends(get_db)
):
    """
    Explore company professionals available to connect, give career advice,
    conduct mock interviews, or answer direct questions.
    Mentors can offer free AMA/guidance or set an hourly fee.
    """
    query = db.query(CompanyMentorProfile).filter(CompanyMentorProfile.is_active == True)

    if company:
        query = query.filter(CompanyMentorProfile.company_name.ilike(f"%{company}%"))
    if free_only:
        query = query.filter(CompanyMentorProfile.hourly_fee == 0.0)
    elif max_fee is not None:
        query = query.filter(CompanyMentorProfile.hourly_fee <= max_fee)
    if can_refer is not None:
        query = query.filter(CompanyMentorProfile.can_give_referral == can_refer)

    mentors = query.all()
    return [build_mentor_profile_response(m) for m in mentors]

@router.post("/profile", response_model=CompanyMentorProfileResponse)
def upsert_mentor_profile(
    profile_in: CompanyMentorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or update your company professional mentor profile.
    Specify your company, designation, whether you can give referrals,
    mock interview availability, and hourly fee (0 for free AMA).
    """
    profile = db.query(CompanyMentorProfile).filter(CompanyMentorProfile.user_id == current_user.id).first()
    if profile:
        for key, val in profile_in.model_dump().items():
            setattr(profile, key, val)
    else:
        profile = CompanyMentorProfile(
            user_id=current_user.id,
            **profile_in.model_dump()
        )
        db.add(profile)

    # Sync company to user profile
    current_user.company = profile_in.company_name
    current_user.job_title = profile_in.job_title
    current_user.is_company_verified = True

    db.commit()
    db.refresh(profile)
    return build_mentor_profile_response(profile)

@router.post("/ask", response_model=DirectQuestionResponse, status_code=status.HTTP_201_CREATED)
def ask_direct_question(
    q_in: DirectQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question directly to a professional from any company.
    Choose whether the question is public (visible for community learning) or private.
    """
    if q_in.mentor_user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot ask questions to yourself.")

    mentor_user = db.query(User).filter(User.id == q_in.mentor_user_id).first()
    if not mentor_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target mentor user not found.")

    question = DirectMentorQuestion(
        mentor_user_id=q_in.mentor_user_id,
        asker_user_id=current_user.id,
        title=q_in.title,
        question_text=q_in.question_text,
        is_private=q_in.is_private,
        status="PENDING_REPLY"
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return build_direct_question_response(question)

@router.get("/questions", response_model=List[DirectQuestionResponse])
def list_mentor_questions(
    mentor_user_id: Optional[int] = Query(None, description="Filter questions asked to a specific mentor"),
    status_filter: Optional[str] = Query(None, description="Filter by status e.g. PENDING_REPLY, ANSWERED"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List direct mentor questions.
    Public questions are visible to all users.
    Private questions are only visible to the asker or mentor.
    """
    query = db.query(DirectMentorQuestion)

    if mentor_user_id:
        query = query.filter(DirectMentorQuestion.mentor_user_id == mentor_user_id)
    if status_filter:
        query = query.filter(DirectMentorQuestion.status == status_filter.upper())

    # Privacy filtering: public questions OR questions where current_user is asker or mentor
    if current_user:
        query = query.filter(
            or_(
                DirectMentorQuestion.is_private == False,
                DirectMentorQuestion.asker_user_id == current_user.id,
                DirectMentorQuestion.mentor_user_id == current_user.id
            )
        )
    else:
        query = query.filter(DirectMentorQuestion.is_private == False)

    questions = query.order_by(DirectMentorQuestion.created_at.desc()).all()
    return [build_direct_question_response(q) for q in questions]

@router.post("/questions/{question_id}/reply", response_model=DirectQuestionResponse)
def reply_to_direct_question(
    question_id: int,
    reply_in: DirectQuestionReply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Company professional answers a direct question submitted to them.
    """
    q = db.query(DirectMentorQuestion).filter(DirectMentorQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    if q.mentor_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the designated company mentor can answer this question."
        )

    q.mentor_response = reply_in.mentor_response
    q.status = "ANSWERED"
    q.answered_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(q)
    return build_direct_question_response(q)
