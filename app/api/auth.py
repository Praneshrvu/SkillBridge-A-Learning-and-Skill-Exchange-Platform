from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserMe, UserUpdate, Token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & User Account"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user on SkillBridge.
    Users can choose to keep their identity confidential upon registration (is_confidential: true/false).
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Check display name
    existing_display = db.query(User).filter(User.display_name == user_in.display_name).first()
    if existing_display:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This display name/alias is already taken. Please choose another one."
        )

    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        display_name=user_in.display_name,
        hashed_password=get_password_hash(user_in.password),
        phone=user_in.phone,
        bio=user_in.bio,
        company=user_in.company,
        job_title=user_in.job_title,
        is_confidential=user_in.is_confidential,
        is_confidential_teacher=user_in.is_confidential_teacher or user_in.is_confidential,
        is_confidential_learner=user_in.is_confidential_learner or user_in.is_confidential,
        is_company_verified=bool(user_in.company and user_in.company.strip())
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    token = create_access_token(subject=db_user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user_id=db_user.id,
        display_name=db_user.display_name,
        is_confidential=db_user.is_confidential,
        is_confidential_teacher=db_user.is_confidential_teacher,
        is_confidential_learner=db_user.is_confidential_learner
    )

@router.post("/login", response_model=Token)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Standard JSON login endpoint returning a JWT bearer token.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        display_name=user.display_name,
        is_confidential=user.is_confidential,
        is_confidential_teacher=getattr(user, "is_confidential_teacher", False),
        is_confidential_learner=getattr(user, "is_confidential_learner", False)
    )

@router.post("/token", response_model=Token, include_in_schema=False)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 compatible token login for Swagger UI authorization button.
    Username field corresponds to email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        display_name=user.display_name,
        is_confidential=user.is_confidential,
        is_confidential_teacher=getattr(user, "is_confidential_teacher", False),
        is_confidential_learner=getattr(user, "is_confidential_learner", False)
    )

@router.get("/me", response_model=UserMe)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieves the private profile of the currently authenticated user.
    """
    return current_user

@router.put("/me", response_model=UserMe)
def update_my_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the authenticated user's profile.
    Allows toggling the confidentiality mode (`is_confidential: true/false`).
    When confidential mode is enabled, other users will only see your display name
    and what you can teach / explain, while your personal identity remains hidden.
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    if "display_name" in update_data and update_data["display_name"] != current_user.display_name:
        existing = db.query(User).filter(User.display_name == update_data["display_name"]).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This display name is already taken by another user."
            )

    for field, value in update_data.items():
        setattr(current_user, field, value)

    if current_user.company and current_user.company.strip():
        current_user.is_company_verified = True

    db.commit()
    db.refresh(current_user)
    return current_user

