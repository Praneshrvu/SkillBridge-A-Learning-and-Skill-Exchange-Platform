from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage, CommunityMessage
from app.models.skill import UserSkill
from app.models.company_mentor import CompanyMentorProfile
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse, ConversationSummary,
    CommunityMessageCreate, CommunityMessageResponse, ChatUserDirectoryItem
)
from app.schemas.user import UserPublic
from app.api.notifications import create_notification

router = APIRouter(prefix="/chat", tags=["Direct Chat & Messaging"])

COMMUNITY_CHANNELS = [
    {
        "id": "general",
        "name": "🌐 #global-lobby",
        "title": "Global Community Lounge",
        "description": "Open place where everyone on SkillBridge can chat, introduce themselves, and find peers."
    },
    {
        "id": "code-and-tech",
        "name": "💻 #code-and-tech",
        "title": "Programming & Architecture",
        "description": "Live tech discussions: C++, Java Spring, Python, algorithms, and system design."
    },
    {
        "id": "interview-prep",
        "name": "🎯 #interview-prep",
        "title": "Interview & FAANG Loops",
        "description": "Mock interview advice, technical screenings, behavioral questions, and tips."
    },
    {
        "id": "barter-hub",
        "name": "🤝 #barter-hub",
        "title": "Skill Barter Exchange Hub",
        "description": "Pitch your skills and propose free $0 2-way learning barter swaps in open chat."
    }
]

def format_chat_message(msg: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender=UserPublic.from_orm_with_privacy(msg.sender, "general"),
        receiver=UserPublic.from_orm_with_privacy(msg.receiver, "general"),
    )

# ----------------- 1. DIRECT 1-ON-1 MESSAGES -----------------

@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a direct chat message to another user (teacher, learner, mentor, or peer).
    """
    if payload.receiver_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a direct message to yourself."
        )
    
    receiver = db.query(User).filter(User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {payload.receiver_id} not found."
        )
    
    clean_content = payload.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank."
        )

    msg = ChatMessage(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        content=clean_content,
        is_read=False
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Notify receiver of new direct message
    try:
        snippet = clean_content if len(clean_content) <= 60 else clean_content[:57] + "..."
        create_notification(
            db=db,
            user_id=receiver.id,
            title="New Direct Message 💬",
            message=f"{current_user.display_name}: \"{snippet}\"",
            notification_type="NEW_MESSAGE",
            link_tab="tab-chat"
        )
    except Exception:
        pass
    
    return format_chat_message(msg)

@router.get("/conversations", response_model=List[ConversationSummary])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all active direct chat conversations for the current user.
    """
    messages = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == current_user.id))
        .order_by(desc(ChatMessage.created_at))
        .all()
    )

    conversation_map = {}
    for m in messages:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if other_id not in conversation_map:
            conversation_map[other_id] = {
                "latest_msg": m,
                "unread_count": 0
            }
        if m.receiver_id == current_user.id and not m.is_read:
            conversation_map[other_id]["unread_count"] += 1

    summaries = []
    for other_id, data in conversation_map.items():
        partner = db.query(User).filter(User.id == other_id).first()
        if not partner:
            continue
        latest = data["latest_msg"]
        summaries.append(
            ConversationSummary(
                other_user=UserPublic.from_orm_with_privacy(partner, "general"),
                last_message=latest.content,
                last_message_time=latest.created_at,
                unread_count=data["unread_count"]
            )
        )

    summaries.sort(key=lambda s: s.last_message_time, reverse=True)
    return summaries

@router.get("/conversations/{user_id}", response_model=List[ChatMessageResponse])
def get_conversation_thread(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all chat messages between current user and specified user.
    Automatically marks incoming messages from this user as read.
    """
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    # Mark incoming unread messages as read
    db.query(ChatMessage).filter(
        ChatMessage.sender_id == user_id,
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()

    messages = (
        db.query(ChatMessage)
        .filter(
            or_(
                and_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == user_id),
                and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == current_user.id),
            )
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return [format_chat_message(m) for m in messages]

# ----------------- 2. PUBLIC COMMUNITY LOUNGE (CHAT WITH ANYONE) -----------------

@router.get("/community/channels")
def get_community_channels(db: Session = Depends(get_db)):
    """Returns list of public community chat channels with real-time message count."""
    results = []
    for ch in COMMUNITY_CHANNELS:
        count = db.query(CommunityMessage).filter(CommunityMessage.channel == ch["id"]).count()
        results.append({
            **ch,
            "message_count": count
        })
    return results

@router.get("/community/messages", response_model=List[CommunityMessageResponse])
def get_community_messages(
    channel: str = "general",
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get live messages from the public community chatroom / lounge for a given channel.
    Anyone on SkillBridge can read and participate!
    """
    messages = (
        db.query(CommunityMessage)
        .filter(CommunityMessage.channel == channel)
        .order_by(CommunityMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        CommunityMessageResponse(
            id=m.id,
            sender_id=m.sender_id,
            channel=m.channel,
            content=m.content,
            created_at=m.created_at,
            sender=UserPublic.from_orm_with_privacy(m.sender, "general")
        )
        for m in messages
    ]

@router.post("/community/messages", response_model=CommunityMessageResponse, status_code=status.HTTP_201_CREATED)
def post_community_message(
    payload: CommunityMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Post a message to the public community chatting place.
    Allows any user on SkillBridge to chat with everyone in real time.
    """
    clean_content = payload.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank."
        )

    clean_channel = payload.channel.strip().lower() or "general"
    msg = CommunityMessage(
        sender_id=current_user.id,
        channel=clean_channel,
        content=clean_content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return CommunityMessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        channel=msg.channel,
        content=msg.content,
        created_at=msg.created_at,
        sender=UserPublic.from_orm_with_privacy(current_user, "general")
    )

# ----------------- 3. USER DIRECTORY (CHAT WITH ANYONE) -----------------

@router.get("/users-directory", response_model=List[ChatUserDirectoryItem])
def get_users_directory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Directory of all users on SkillBridge so members can find and chat with anyone!
    Includes their teaching and learning skills, company mentor status, and privacy preferences.
    """
    users = db.query(User).filter(User.id != current_user.id).all()
    directory = []

    for u in users:
        teach_skills = [
            us.skill.name for us in u.user_skills if us.skill_type == "TEACH"
        ]
        learn_skills = [
            us.skill.name for us in u.user_skills if us.skill_type == "LEARN"
        ]
        
        mentor_prof = db.query(CompanyMentorProfile).filter(CompanyMentorProfile.user_id == u.id).first()
        is_mentor = mentor_prof is not None
        mentor_co = mentor_prof.company_name if mentor_prof else None

        pub = UserPublic.from_orm_with_privacy(u, "general")

        directory.append(
            ChatUserDirectoryItem(
                id=u.id,
                display_name=pub.display_name,
                is_confidential=pub.is_confidential,
                bio=pub.bio,
                company=pub.company,
                job_title=pub.job_title,
                phone=pub.phone,
                email=pub.email,
                show_phone=pub.show_phone,
                show_email=pub.show_email,
                teaching_skills=teach_skills,
                learning_skills=learn_skills,
                is_mentor=is_mentor,
                mentor_company=mentor_co
            )
        )

    return directory
