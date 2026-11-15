import re
from typing import List, Optional
from fastapi import APIRouter
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantActionLink

router = APIRouter(prefix="/assistant", tags=["AI Support & Platform Assistant"])

# Knowledge base of topics and answers
ASSISTANT_KNOWLEDGE_BASE = [
    {
        "keywords": ["barter", "swap", "free", "$0", "trade skill", "reciprocal", "two way", "2-way"],
        "reply": (
            "🤝 **How $0 Skill Barter Works on SkillBridge:**\n\n"
            "SkillBridge pairs two users who can teach each other symmetrically at **zero cost ($0)**!\n"
            "For example: Alice teaches C++ and wants Java; Bob teaches Java and wants C++. "
            "Our bipartite algorithm matches you with 100% compatibility.\n\n"
            "• Go to **2-Way Barter Matcher** in the left sidebar.\n"
            "• Click **'Initiate $0 Skill Barter Swap'** to send a proposal.\n"
            "• Once accepted, the virtual classroom and code sandboxes unlock immediately!"
        ),
        "suggestions": ["How does Escrow work?", "How to use Anonymous Mode?", "Where is the virtual classroom?"],
        "action_link": {"label": "Open 2-Way Barter Matcher", "tab": "tab-barter"}
    },
    {
        "keywords": ["escrow", "payment", "pay", "fee", "money", "release", "refund", "paid", "$", "wallet"],
        "reply": (
            "💳 **How Payment & Escrow Works on SkillBridge:**\n\n"
            "Paid tutoring sessions are protected by our **Cryptographic Escrow State Machine**:\n"
            "1. **Proposal:** Teacher sets an hourly rate (e.g. $25/hr) and accepts your request.\n"
            "2. **Deposit:** The learner deposits the fee into platform escrow via **'Pay into Escrow'** (`PAID_ESCROW`). The teacher cannot withdraw the money upfront.\n"
            "3. **Delivery:** Conduct your live session in the confidential WebRTC classroom.\n"
            "4. **Release:** Once satisfied, the learner clicks **'Release Funds to Teacher'** (`RELEASE_TO_TEACHER`).\n"
            "5. **Refund:** In case of disputes or cancellations, funds are safely refunded (`REFUNDED`)."
        ),
        "suggestions": ["How does $0 Barter work?", "Where do I see my sessions?", "How do I leave a review?"],
        "action_link": {"label": "View My Exchanges & Escrow", "tab": "tab-exchanges"}
    },
    {
        "keywords": ["confidential", "anonymous", "privacy", "stealth", "hide", "mask", "secret", "moonlight"],
        "reply": (
            "🔒 **Confidentiality & Stealth Mode on SkillBridge:**\n\n"
            "SkillBridge protects senior engineers and corporate employees from employer moonlighting risks:\n"
            "• **Master Stealth Mode:** Completely hides your real name, company, email, and phone across the whole platform.\n"
            "• **Teacher Confidentiality:** Allows you to teach anonymously under a platform alias while keeping your learner profile public.\n"
            "• **Learner Confidentiality:** Keeps your learning goals private.\n"
            "• **Selective Contact Disclosure:** You decide whether to show or hide phone and email.\n\n"
            "All sensitive fields are automatically redacted before sending data over the network."
        ),
        "suggestions": ["Edit my privacy settings", "How does in-platform chat work?", "What is zero-disclosure?"],
        "action_link": {"label": "Open Profile & Privacy Control", "tab": "tab-profile"}
    },
    {
        "keywords": ["classroom", "meet", "jitsi", "video", "call", "voice", "screen", "sandbox", "codeshare", "whiteboard", "excalidraw"],
        "reply": (
            "🎥 **Zero-Disclosure Virtual Classrooms:**\n\n"
            "When an exchange proposal is accepted, SkillBridge unlocks 3 integrated live collaboration tools:\n"
            "1. **Encrypted WebRTC Room (Jitsi Meet):** Disposable video/voice link configured with video muted by default for voice + screen-sharing without needing a Google/Zoom account.\n"
            "2. **Codeshare Live Sandbox:** Real-time collaborative code editor for live pair programming.\n"
            "3. **Excalidraw Whiteboard:** Collaborative digital canvas for architecture diagrams.\n\n"
            "You can find these 1-click links inside the session card in **My Exchanges & Sessions**."
        ),
        "suggestions": ["View my active sessions", "How does in-platform chat work?", "How to accept an exchange?"],
        "action_link": {"label": "Go to My Exchanges", "tab": "tab-exchanges"}
    },
    {
        "keywords": ["error", "problem", "issue", "bug", "not working", "405", "failed", "stuck", "refresh", "cannot"],
        "reply": (
            "🛠️ **Website Troubleshooting & Quick Fixes:**\n\n"
            "Here are quick solutions to common platform issues:\n"
            "• **Old layout or styles not updating:** Press `Ctrl + Shift + R` (or `Ctrl + F5`) in your browser to perform a hard-refresh and clear cached CSS/JS.\n"
            "• **405 Method Not Allowed on Status:** SkillBridge supports both `PUT` and `PATCH` methods for updating exchange status. Ensure your server is running the latest build.\n"
            "• **Camera/Microphone Permission in Classroom:** If prompted by Jitsi Meet, click 'Allow' in your browser address bar.\n"
            "• **Login Failed:** Make sure your email and password match, or click **'🎭 Personas'** in the topbar to test with 1-click demo accounts."
        ),
        "suggestions": ["Contact Customer Support", "How to use demo personas?", "Check Server Health"],
        "action_link": {"label": "Open Help & Support Tickets", "tab": "tab-support"}
    },
    {
        "keywords": ["persona", "demo", "switch", "alice", "bob", "rahul", "sarah", "maya", "stealth"],
        "reply": (
            "🎭 **Using Demo Personas for Quick Testing:**\n\n"
            "SkillBridge provides pre-seeded demo accounts so evaluators can test with one click:\n"
            "• **Alice_CppMaster:** Knows C++, wants Java (100% Barter Match with Bob).\n"
            "• **JavaGuru_Bob:** Knows Java, wants C++ (hides personal phone/email).\n"
            "• **StealthArchitect_99:** 100% Anonymous teacher mode.\n"
            "• **Sarah_GoogleL6:** Verified Google Staff Engineer hosting free Q&A.\n"
            "• **Rahul_Amazon:** Solutions Architect providing paid AWS mock interviews ($25/hr).\n\n"
            "Click the **'🎭 Personas'** button in the topbar to switch anytime!"
        ),
        "suggestions": ["Switch to Alice", "How does $0 Barter work?", "Open Question Bank"],
        "action_link": {"label": "Explore Teachers Catalog", "tab": "tab-catalog"}
    },
    {
        "keywords": ["teach me", "learn", "course", "tutorial", "code for me", "full course", "teach full", "syllabus", "lectures"],
        "reply": (
            "🎓 **Looking to Learn a Course or Topic?**\n\n"
            "I am the **SkillBridge Platform Assistant**! I help you navigate the website, understand escrow & barter, and solve platform issues.\n\n"
            "I don't teach full programming courses myself. Instead, SkillBridge connects you directly with real engineers:\n"
            "• **Course Reference Videos & Resources:** Check the new **'Course Videos & Resources'** tab in the sidebar for curated video lessons, cheat sheets, and blueprints!\n"
            "• **Teacher Catalog:** Browse verified peers offering 1-on-1 tutoring in C++, Java, Python, and System Design.\n"
            "• **2-Way Barter Matcher:** Swap what you know for what you want to learn at $0 cost!"
        ),
        "suggestions": ["Open Course Videos Tab", "Explore Teacher Catalog", "How does $0 Barter work?"],
        "action_link": {"label": "Watch Reference Videos", "tab": "tab-videos"}
    },
    {
        "keywords": ["notification", "alert", "bell", "inbox", "message alert"],
        "reply": (
            "🔔 **SkillBridge Notification System:**\n\n"
            "Click the **Bell Icon (🔔)** in the top right corner of the page to view your live alerts:\n"
            "• New exchange proposals sent by learners.\n"
            "• Instant alerts when a teacher accepts or declines your request.\n"
            "• Escrow payment confirmations and wallet release notifications.\n"
            "• Incoming direct chat messages from peers.\n\n"
            "Unread notifications are highlighted with a badge, and you can mark them as read with one click."
        ),
        "suggestions": ["Where are my exchanges?", "How does chat work?", "Help with a website issue"],
        "action_link": {"label": "Open My Exchanges", "tab": "tab-exchanges"}
    },
    {
        "keywords": ["video", "reference video", "resource", "cheat sheet", "perk", "blueprint"],
        "reply": (
            "🎬 **Course Reference Videos & Special Resources:**\n\n"
            "We have added a dedicated **'Course Videos & Resources'** hub in the left sidebar!\n"
            "• **Reference Videos:** Watch concise, high-yield conceptual videos on C++, Enterprise Java, FastAPI, System Design, and FAANG DSA.\n"
            "• **Special Paid Learner Perks:** Learners who enroll in paid sessions unlock exclusive downloadable Architecture Blueprints, Interview Cheat Sheets, and Practice Problem Sets!"
        ),
        "suggestions": ["Go to Course Videos", "How does paid tutoring work?", "Explore Teacher Catalog"],
        "action_link": {"label": "Open Course Videos & Resources", "tab": "tab-videos"}
    }
]

def find_best_assistant_reply(user_message: str) -> AssistantChatResponse:
    lower_msg = user_message.lower().strip()
    
    # 1. Check for full course teaching attempts first
    course_learning_patterns = ["teach me", "learn full", "full course", "give me lectures", "explain all of python", "write full code for"]
    if any(p in lower_msg for p in course_learning_patterns):
        matched = next(kb for kb in ASSISTANT_KNOWLEDGE_BASE if "teach me" in kb["keywords"])
        return AssistantChatResponse(
            reply=matched["reply"],
            suggestions=matched["suggestions"],
            action_link=AssistantActionLink(**matched["action_link"]) if matched.get("action_link") else None
        )

    # 2. Match against knowledge base by keyword overlap score
    best_match = None
    highest_score = 0
    
    for item in ASSISTANT_KNOWLEDGE_BASE:
        score = 0
        for kw in item["keywords"]:
            if kw in lower_msg:
                score += len(kw.split()) * 2 # multi-word keywords count higher
        if score > highest_score:
            highest_score = score
            best_match = item
            
    if best_match and highest_score > 0:
        return AssistantChatResponse(
            reply=best_match["reply"],
            suggestions=best_match["suggestions"],
            action_link=AssistantActionLink(**best_match["action_link"]) if best_match.get("action_link") else None
        )
        
    # 3. Default friendly fallback
    return AssistantChatResponse(
        reply=(
            "👋 **Hello! I'm your SkillBridge Platform Assistant.**\n\n"
            "I'm here to help you navigate SkillBridge, explain our features, and solve any website issues you encounter.\n\n"
            "You can ask me about:\n"
            "• **$0 Skill Barter:** How reciprocal skill swapping works.\n"
            "• **Escrow & Payments:** How money is held safely until session completion.\n"
            "• **Confidential Mode:** How to mentor without employer moonlighting risks.\n"
            "• **Virtual Classrooms:** WebRTC audio/video and Codeshare sandboxes.\n"
            "• **Troubleshooting:** Quick fixes for browser, layout, or connection problems."
        ),
        suggestions=[
            "How does $0 Barter work?",
            "How does Escrow payment work?",
            "How to stay anonymous?",
            "Where are course reference videos?",
            "I have a website problem"
        ],
        action_link=None
    )

@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(payload: AssistantChatRequest):
    """
    Intelligent SkillBridge platform assistant chatbot.
    Provides answers about website usage, escrow, barter, privacy, and troubleshooting.
    """
    return find_best_assistant_reply(payload.message)
