from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.models.question_bank import InterviewQuestion, QuestionVote
from app.models.user import User
from app.schemas.question_bank import (
    InterviewQuestionCreate, InterviewQuestionUpdate,
    InterviewQuestionResponse, QuestionVoteResponse
)
from app.schemas.user import UserPublic
from app.api.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/questions", tags=["Company Training & Interview Question Bank"])

def build_question_response(q: InterviewQuestion) -> InterviewQuestionResponse:
    author_pub = UserPublic.from_orm_with_privacy(q.author) if q.author else None
    return InterviewQuestionResponse(
        id=q.id,
        company_name=q.company_name,
        role=q.role,
        category=q.category,
        round_type=q.round_type,
        difficulty=q.difficulty,
        question_text=q.question_text,
        answer_explanation=q.answer_explanation,
        tags=q.tags,
        upvotes_count=q.upvotes_count,
        author_id=q.author_id,
        created_at=q.created_at,
        author=author_pub
    )

@router.get("", response_model=List[InterviewQuestionResponse])
def list_interview_questions(
    company: Optional[str] = Query(None, description="Filter by company name e.g. Google, Amazon, Infosys, TCS"),
    role: Optional[str] = Query(None, description="Filter by role e.g. SDE, Cloud Engineer, Data Analyst"),
    category: Optional[str] = Query(None, description="Filter by topic e.g. DSA, System Design, SQL, Core CS"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty e.g. Easy, Medium, Hard"),
    search: Optional[str] = Query(None, description="Search keyword in question text, explanation, or tags"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search and filter interview & training questions asked across major tech companies.
    """
    query = db.query(InterviewQuestion)

    if company:
        query = query.filter(InterviewQuestion.company_name.ilike(f"%{company}%"))
    if role:
        query = query.filter(InterviewQuestion.role.ilike(f"%{role}%"))
    if category:
        query = query.filter(InterviewQuestion.category.ilike(f"%{category}%"))
    if difficulty:
        query = query.filter(InterviewQuestion.difficulty.ilike(difficulty))
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                InterviewQuestion.question_text.ilike(pattern),
                InterviewQuestion.answer_explanation.ilike(pattern),
                InterviewQuestion.tags.ilike(pattern)
            )
        )

    questions = query.order_by(InterviewQuestion.upvotes_count.desc(), InterviewQuestion.created_at.desc()).offset(skip).limit(limit).all()
    return [build_question_response(q) for q in questions]

@router.get("/companies", response_model=List[dict])
def list_featured_companies(db: Session = Depends(get_db)):
    """
    Returns unique companies present in the question bank with count of questions.
    """
    results = (
        db.query(InterviewQuestion.company_name, func.count(InterviewQuestion.id))
        .group_by(InterviewQuestion.company_name)
        .order_by(func.count(InterviewQuestion.id).desc())
        .all()
    )
    return [{"company_name": r[0], "questions_count": r[1]} for r in results]

@router.get("/{question_id}", response_model=InterviewQuestionResponse)
def get_question_detail(question_id: int, db: Session = Depends(get_db)):
    """
    Get full question detail with in-depth solution and explanation.
    """
    q = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    return build_question_response(q)

@router.post("", response_model=InterviewQuestionResponse, status_code=status.HTTP_201_CREATED)
def contribute_interview_question(
    q_in: InterviewQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Contribute a question asked during company interviews, campus recruitment, or corporate training.
    """
    question = InterviewQuestion(
        company_name=q_in.company_name,
        role=q_in.role,
        category=q_in.category,
        round_type=q_in.round_type,
        difficulty=q_in.difficulty,
        question_text=q_in.question_text,
        answer_explanation=q_in.answer_explanation,
        tags=q_in.tags,
        author_id=current_user.id
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return build_question_response(question)

@router.post("/{question_id}/vote", response_model=QuestionVoteResponse)
def vote_on_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upvote an interview question or toggle the vote.
    """
    q = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    existing_vote = db.query(QuestionVote).filter(
        QuestionVote.question_id == question_id,
        QuestionVote.user_id == current_user.id
    ).first()

    if existing_vote:
        # Remove vote (toggle off)
        db.delete(existing_vote)
        q.upvotes_count = max(0, q.upvotes_count - 1)
        user_voted = False
    else:
        # Add upvote
        vote = QuestionVote(question_id=question_id, user_id=current_user.id, vote_type=1)
        db.add(vote)
        q.upvotes_count += 1
        user_voted = True

    db.commit()
    db.refresh(q)
    return QuestionVoteResponse(
        question_id=q.id,
        upvotes_count=q.upvotes_count,
        user_voted=user_voted
    )

