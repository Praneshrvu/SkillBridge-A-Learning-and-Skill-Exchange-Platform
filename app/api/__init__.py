from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.skills import router as skills_router
from app.api.exchanges import router as exchanges_router
from app.api.questions import router as questions_router
from app.api.company_mentors import router as company_mentors_router
from app.api.chat import router as chat_router
from app.api.support import router as support_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(skills_router)
api_router.include_router(exchanges_router)
api_router.include_router(questions_router)
api_router.include_router(company_mentors_router)
api_router.include_router(chat_router)
api_router.include_router(support_router)

