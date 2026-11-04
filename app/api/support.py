from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.api.deps import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.support import SupportTicket
from app.schemas.support import SupportTicketCreate, SupportTicketResponse, FAQItem

router = APIRouter(prefix="/support", tags=["Customer Support & Help Desk"])

FAQ_DATA = [
    FAQItem(
        category="Barter Exchange",
        question="How does the $0 Skill Barter Swap work?",
        answer="SkillBridge features an automated 2-way barter matching algorithm. When user A knows C++ and wants to learn Java, and user B knows Java and wants to learn C++, the system pairs them. Both parties agree to exchange tutoring hours at zero financial cost ($0 swap)."
    ),
    FAQItem(
        category="Escrow & Payments",
        question="How does the Escrow Payment system protect students and teachers?",
        answer="When you book a paid tutoring session, your payment is held securely in escrow (status: PAID_ESCROW). The funds are only transferred to the teacher after the session is successfully delivered and you confirm completion (RELEASE_TO_TEACHER). If any dispute occurs, a full refund can be issued."
    ),
    FAQItem(
        category="Privacy & Confidentiality",
        question="How does Confidential / Anonymous Mode protect my identity?",
        answer="SkillBridge offers fine-grained confidentiality control. You can choose to be confidential as a Teacher (your real name, company, email, and phone are hidden; learners only see your alias and teaching abilities) or as a Learner (teachers cannot see your employer or real identity). You can also selectively decide whether to show or hide your phone and email."
    ),
    FAQItem(
        category="Confidential Teaching & Learning",
        question="If the person teaching is confidential, in what mode of communication will they teach?",
        answer="Confidential sessions operate under 4 zero-disclosure communication modes: (1) In-Platform Direct Chat for curriculum notes, code snippets, and Q&A under an alias; (2) 1-Click Encrypted Virtual Classroom via disposable Jitsi links with camera disabled, using voice and IDE/whiteboard screen-sharing only without external accounts; (3) Live Collaborative Sandboxes (Codeshare & Excalidraw) for hands-on pair programming; and (4) Platform Escrow & Wallet payouts so personal bank accounts, phone numbers, and UPI handles are never disclosed."
    ),
    FAQItem(
        category="Company Mentors",
        question="How are Company Mentors verified?",
        answer="Company mentors (such as L6 Staff Engineers at Google or Principal Solutions Architects at Amazon AWS) have verified corporate credentials and work experience. They are available for direct 1-on-1 Q&A, mock interviews, and career guidance."
    ),
    FAQItem(
        category="Community Chat",
        question="Can I chat with anyone before committing to a learning session?",
        answer="Yes! SkillBridge features both a public Community Lounge with thematic channels (#global-lobby, #code-and-tech, #interview-prep, #barter-hub) and 1-on-1 direct messaging. You can message any teacher, learner, or mentor directly to discuss curriculum and schedules before booking."
    )
]

@router.get("/faq", response_model=List[FAQItem])
def get_faqs():
    """Retrieve platform FAQs and help articles."""
    return FAQ_DATA

@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Submits a customer support ticket.
    Can be submitted by logged-in users or prospective members needing assistance.
    """
    user_id = current_user.id if current_user else None
    ticket = SupportTicket(
        user_id=user_id,
        category=payload.category,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        contact_email=payload.contact_email,
        priority=payload.priority.upper(),
        status="OPEN"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/tickets", response_model=List[SupportTicketResponse])
def get_my_support_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns support tickets submitted by the authenticated user."""
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(desc(SupportTicket.created_at))
        .all()
    )

