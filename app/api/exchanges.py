from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.exchange import ExchangeRequest, Review
from app.models.user import User
from app.models.skill import Skill
from app.schemas.exchange import (
    ExchangeCreate, ExchangeResponse, ExchangeStatusUpdate,
    PaymentAction, ReviewCreate, ReviewResponse
)
from app.schemas.user import UserPublic
from app.schemas.skill import SkillResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/exchanges", tags=["Skill Exchanges & Tutoring Sessions"])

def build_exchange_response(ex: ExchangeRequest) -> ExchangeResponse:
    sender_pub = UserPublic.from_orm_with_privacy(ex.sender)
    receiver_pub = UserPublic.from_orm_with_privacy(ex.receiver)
    
    sender_offered = SkillResponse.model_validate(ex.sender_offered_skill) if ex.sender_offered_skill else None
    receiver_requested = SkillResponse.model_validate(ex.receiver_requested_skill) if ex.receiver_requested_skill else None
    
    reviews = [ReviewResponse.model_validate(r) for r in ex.reviews]
    
    return ExchangeResponse(
        id=ex.id,
        sender_id=ex.sender_id,
        receiver_id=ex.receiver_id,
        exchange_type=ex.exchange_type,
        sender_offered_skill_id=ex.sender_offered_skill_id,
        receiver_requested_skill_id=ex.receiver_requested_skill_id,
        monetary_amount=ex.monetary_amount,
        currency=ex.currency,
        payment_status=ex.payment_status,
        status=ex.status,
        session_details=ex.session_details,
        created_at=ex.created_at,
        updated_at=ex.updated_at,
        sender=sender_pub,
        receiver=receiver_pub,
        sender_offered_skill=sender_offered,
        receiver_requested_skill=receiver_requested,
        reviews=reviews
    )

@router.post("", response_model=ExchangeResponse, status_code=status.HTTP_201_CREATED)
def create_exchange_request(
    ex_in: ExchangeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send an exchange or tutoring request:
    - Mode 'BARTER': e.g., I teach you C++ and you teach me Java ($0).
    - Mode 'PAID_ONE_WAY': Learner requests session with teacher's demanded fee ($X).
    - Mode 'FREE': Voluntary peer mentorship ($0).
    """
    if ex_in.receiver_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot create an exchange request with yourself."
        )

    receiver = db.query(User).filter(User.id == ex_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

    if ex_in.sender_offered_skill_id:
        s_skill = db.query(Skill).filter(Skill.id == ex_in.sender_offered_skill_id).first()
        if not s_skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offered skill not found.")

    if ex_in.receiver_requested_skill_id:
        r_skill = db.query(Skill).filter(Skill.id == ex_in.receiver_requested_skill_id).first()
        if not r_skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested skill not found.")

    payment_status = "NOT_APPLICABLE"
    if ex_in.exchange_type == "PAID_ONE_WAY" or ex_in.monetary_amount > 0:
        payment_status = "PAYMENT_PENDING"

    exchange = ExchangeRequest(
        sender_id=current_user.id,
        receiver_id=ex_in.receiver_id,
        exchange_type=ex_in.exchange_type.upper(),
        sender_offered_skill_id=ex_in.sender_offered_skill_id,
        receiver_requested_skill_id=ex_in.receiver_requested_skill_id,
        monetary_amount=ex_in.monetary_amount,
        currency=ex_in.currency,
        payment_status=payment_status,
        status="PENDING",
        session_details=ex_in.session_details
    )
    db.add(exchange)
    db.commit()
    db.refresh(exchange)

    return build_exchange_response(exchange)

@router.get("", response_model=List[ExchangeResponse])
def list_my_exchanges(
    role: Optional[str] = Query(None, description="'sent', 'received', or all if omitted"),
    status_filter: Optional[str] = Query(None, description="Filter by status e.g. PENDING, ACCEPTED, COMPLETED"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all skill exchanges involving the authenticated user (both sent proposals and received requests).
    """
    if role == "sent":
        query = db.query(ExchangeRequest).filter(ExchangeRequest.sender_id == current_user.id)
    elif role == "received":
        query = db.query(ExchangeRequest).filter(ExchangeRequest.receiver_id == current_user.id)
    else:
        query = db.query(ExchangeRequest).filter(
            or_(
                ExchangeRequest.sender_id == current_user.id,
                ExchangeRequest.receiver_id == current_user.id
            )
        )

    if status_filter:
        query = query.filter(ExchangeRequest.status == status_filter.upper())

    exchanges = query.order_by(ExchangeRequest.created_at.desc()).all()
    return [build_exchange_response(ex) for ex in exchanges]

@router.get("/{exchange_id}", response_model=ExchangeResponse)
def get_exchange_details(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full details of a specific exchange request.
    Only accessible by the sender or receiver.
    """
    ex = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found.")
    
    if ex.sender_id != current_user.id and ex.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return build_exchange_response(ex)

@router.patch("/{exchange_id}/status", response_model=ExchangeResponse)
def update_exchange_status(
    exchange_id: int,
    status_update: ExchangeStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept, reject, start, complete, or cancel an exchange request.
    - Receiver can ACCEPT or REJECT a pending proposal.
    - Either party can mark IN_PROGRESS, COMPLETED, or CANCELLED.
    """
    ex = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found.")

    if ex.sender_id != current_user.id and ex.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    new_status = status_update.status.upper()
    valid_statuses = ["PENDING", "ACCEPTED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Must be one of {valid_statuses}."
        )

    # Receiver can accept or reject
    if new_status in ["ACCEPTED", "REJECTED"] and ex.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient of the request can accept or reject it."
        )

    ex.status = new_status
    ex.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ex)

    return build_exchange_response(ex)

@router.post("/{exchange_id}/payment", response_model=ExchangeResponse)
def handle_payment_action(
    exchange_id: int,
    action_in: PaymentAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handles payment workflow for paid tutoring/teaching sessions:
    - PAY_ESCROW: Learner funds the session securely into escrow.
    - RELEASE_TO_TEACHER: Once session is completed, funds are disbursed to teacher.
    - REFUND: If session cannot take place, refund to learner.
    """
    ex = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found.")

    if ex.sender_id != current_user.id and ex.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if ex.monetary_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This is a free / barter exchange. No payment is required."
        )

    act = action_in.action.upper()
    if act == "PAY_ESCROW":
        # Learner deposits money
        if ex.sender_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the student/learner can pay into escrow.")
        ex.payment_status = "PAID_ESCROW"
        if ex.status == "PENDING":
            ex.status = "ACCEPTED"
            
    elif act == "RELEASE_TO_TEACHER":
        # Learner or system releases funds after session
        if ex.sender_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the student/learner can release funds to the teacher.")
        ex.payment_status = "RELEASED_TO_TEACHER"
        ex.status = "COMPLETED"
        
    elif act == "REFUND":
        ex.payment_status = "REFUNDED"
        ex.status = "CANCELLED"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown payment action: {act}")

    ex.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ex)

    return build_exchange_response(ex)

@router.post("/{exchange_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_session_review(
    exchange_id: int,
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a review and star rating for a completed skill exchange or teaching session.
    """
    ex = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found.")

    if ex.sender_id != current_user.id and ex.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You were not part of this session.")

    # Target of review
    reviewee_id = ex.receiver_id if current_user.id == ex.sender_id else ex.sender_id

    # Check duplicate review
    existing = db.query(Review).filter(
        Review.exchange_id == exchange_id,
        Review.reviewer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already reviewed this session.")

    review = Review(
        exchange_id=exchange_id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

