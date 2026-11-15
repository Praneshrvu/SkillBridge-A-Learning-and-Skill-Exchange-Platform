from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AssistantChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

class AssistantActionLink(BaseModel):
    label: str
    tab: str

class AssistantChatResponse(BaseModel):
    reply: str
    suggestions: List[str]
    action_link: Optional[AssistantActionLink] = None
