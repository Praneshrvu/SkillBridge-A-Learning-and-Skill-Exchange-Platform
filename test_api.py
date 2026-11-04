import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_index():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # 2. Web UI index page
    res_ui = client.get("/")
    assert res_ui.status_code == 200
    assert "SkillBridge" in res_ui.text

def test_confidential_profile_masking():
    # Login as Alice
    login_res = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    assert login_res.status_code == 200
    alice_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}

    # 1. Fetch User 3 (David Vance / StealthArchitect_99 who has is_confidential = True as Teacher)
    res = client.get("/api/users/3", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["display_name"] == "StealthArchitect_99"
    assert data["is_confidential"] is True
    # Real personal details must be masked/hidden!
    assert data["full_name"] is None
    assert data["company"] is None
    assert "Confidential" in data["bio"]

    # 2. Test Learner Confidentiality in Catalog (skill_type=LEARN)
    # Maya Lin (User 6) has is_confidential_learner = True
    res_learners = client.get("/api/skills/catalog?skill_type=LEARN")
    assert res_learners.status_code == 200
    learners = res_learners.json()
    maya_listing = next((l for l in learners if l["display_name"] == "StealthLearner_Maya"), None)
    assert maya_listing is not None
    assert maya_listing["is_confidential"] is True
    # Real personal details must be masked for the learner!
    assert maya_listing["full_name"] is None
    assert maya_listing["company"] is None
    assert maya_listing["skill_name"] == "System Design & Architecture"
    assert "distributed rate-limiting" in maya_listing["learning_goal"]

def test_master_skills_and_catalog():
    # Master skills
    res = client.get("/api/skills")
    assert res.status_code == 200
    skills = res.json()
    assert len(skills) >= 5

    # Teacher catalog (skill_type=TEACH)
    res_cat = client.get("/api/skills/catalog?skill_type=TEACH")
    assert res_cat.status_code == 200
    catalog = res_cat.json()
    assert len(catalog) >= 3

    # Learner catalog (skill_type=LEARN)
    res_learn = client.get("/api/skills/catalog?skill_type=LEARN")
    assert res_learn.status_code == 200
    learn_catalog = res_learn.json()
    assert len(learn_catalog) >= 2

def test_smart_barter_matcher():
    # Alice knows C++ and wants Java. Bob knows Java and wants C++.
    # Alice should see Bob as a perfect 2-way barter match!
    login_res = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    alice_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}

    res = client.get("/api/skills/match", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert any(m["peer_display_name"] == "JavaGuru_Bob" for m in data["matches"])

def test_exchange_lifecycle_and_escrow():
    # Alice logs in
    login_res = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    alice_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}

    # Alice proposes a paid session with Rahul (Amazon Mentor, User ID 5)
    proposal = {
        "receiver_id": 5,
        "exchange_type": "PAID_ONE_WAY",
        "monetary_amount": 25.0,
        "currency": "USD",
        "session_details": "1-on-1 Amazon LP and AWS Cloud Mock Interview"
    }
    create_res = client.post("/api/exchanges", json=proposal, headers=headers)
    assert create_res.status_code == 201
    ex_id = create_res.json()["id"]

    # Alice deposits money into escrow
    pay_res = client.post(f"/api/exchanges/{ex_id}/payment", json={"action": "PAY_ESCROW"}, headers=headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["payment_status"] == "PAID_ESCROW"

    # Alice completes session and releases funds to Rahul
    release_res = client.post(f"/api/exchanges/{ex_id}/payment", json={"action": "RELEASE_TO_TEACHER"}, headers=headers)
    assert release_res.status_code == 200
    assert release_res.json()["payment_status"] == "RELEASED_TO_TEACHER"
    assert release_res.json()["status"] == "COMPLETED"

    # Alice submits a 5-star review
    rev_res = client.post(f"/api/exchanges/{ex_id}/review", json={"rating": 5, "comment": "Brilliant mock interview!"}, headers=headers)
    assert rev_res.status_code == 201
    assert rev_res.json()["rating"] == 5

def test_company_question_bank():
    # Filter by Google
    res_google = client.get("/api/questions?company=Google")
    assert res_google.status_code == 200
    assert len(res_google.json()) >= 1

    # Filter by TCS
    res_tcs = client.get("/api/questions?company=TCS")
    assert res_tcs.status_code == 200
    assert len(res_tcs.json()) >= 1

    # Upvoting
    login_res = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    
    vote_res = client.post("/api/questions/1/vote", headers=headers)
    assert vote_res.status_code == 200
    assert "upvotes_count" in vote_res.json()

def test_company_mentors_and_direct_qa():
    # Browse mentors
    res_mentors = client.get("/api/company-mentors")
    assert res_mentors.status_code == 200
    mentors = res_mentors.json()
    assert len(mentors) >= 2
    assert any(m["company_name"] == "Google" for m in mentors)

    # Ask direct question to Sarah (Google Staff Eng, User ID 4)
    login_res = client.post("/api/auth/login", json={"email": "bob@skillbridge.dev", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    q_data = {
        "mentor_user_id": 4,
        "title": "Transitioning to Google Cloud from Enterprise Java",
        "question_text": "What distributed systems concepts are essential?",
        "is_private": False
    }
    ask_res = client.post("/api/company-mentors/ask", json=q_data, headers=headers)
    assert ask_res.status_code == 201
    q_id = ask_res.json()["id"]

    # Sarah logs in and answers Bob's question
    sarah_res = client.post("/api/auth/login", json={"email": "sarah.google@skillbridge.dev", "password": "pass123"})
    sarah_headers = {"Authorization": f"Bearer {sarah_res.json()['access_token']}"}

    ans_res = client.post(
        f"/api/company-mentors/questions/{q_id}/reply",
        json={"mentor_response": "Focus on high throughput streaming, Kafka/PubSub, and consensus protocols."},
        headers=sarah_headers
    )
    assert ans_res.status_code == 200
    assert ans_res.json()["status"] == "ANSWERED"



def test_personal_contact_details_visibility():
    # Login as Bob
    login_res = client.post("/api/auth/login", json={"email": "bob@skillbridge.dev", "password": "pass123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch Alice (User 1): has show_phone=True, show_email=True
    res_alice = client.get("/api/users/1", headers=headers)
    assert res_alice.status_code == 200
    data_alice = res_alice.json()
    assert data_alice["display_name"] == "Alice_CppMaster"
    assert data_alice["show_phone"] is True
    assert data_alice["show_email"] is True
    assert data_alice["phone"] == "+1-555-0101"
    assert data_alice["email"] == "alice@skillbridge.dev"

    # 2. Fetch Bob (User 2): has show_phone=False, show_email=False
    res_bob = client.get("/api/users/2", headers=headers)
    assert res_bob.status_code == 200
    data_bob = res_bob.json()
    assert data_bob["display_name"] == "JavaGuru_Bob"
    assert data_bob["show_phone"] is False
    assert data_bob["show_email"] is False
    assert data_bob["phone"] is None # Hidden from public view!
    assert data_bob["email"] is None # Hidden from public view!

    # 3. Check teacher catalog includes phone & email flags
    cat_res = client.get("/api/skills/catalog?skill_type=TEACH")
    assert cat_res.status_code == 200
    teachers = cat_res.json()
    alice_item = next((t for t in teachers if t["user_id"] == 1), None)
    bob_item = next((t for t in teachers if t["user_id"] == 2), None)
    assert alice_item is not None
    assert alice_item["phone"] == "+1-555-0101"
    assert bob_item is not None
    assert bob_item["phone"] is None

def test_direct_chat_api():
    # 1. Login as Alice
    alice_login = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    assert alice_login.status_code == 200
    alice_token = alice_login.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. Alice sends a direct message to Bob (User ID 2)
    msg_payload = {
        "receiver_id": 2,
        "content": "Hi Bob! Are we still on for our C++ and Java session this Saturday?"
    }
    send_res = client.post("/api/chat/messages", json=msg_payload, headers=alice_headers)
    assert send_res.status_code == 201
    sent_data = send_res.json()
    assert sent_data["content"] == msg_payload["content"]
    assert sent_data["sender_id"] == 1
    assert sent_data["receiver_id"] == 2
    assert sent_data["is_read"] is False

    # 3. Cannot send message to oneself
    self_res = client.post("/api/chat/messages", json={"receiver_id": 1, "content": "Hello myself"}, headers=alice_headers)
    assert self_res.status_code == 400

    # 4. Login as Bob
    bob_login = client.post("/api/auth/login", json={"email": "bob@skillbridge.dev", "password": "pass123"})
    assert bob_login.status_code == 200
    bob_token = bob_login.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 5. Bob fetches active conversations
    convs_res = client.get("/api/chat/conversations", headers=bob_headers)
    assert convs_res.status_code == 200
    convs = convs_res.json()
    assert len(convs) >= 1
    alice_conv = next((c for c in convs if c["other_user"]["id"] == 1), None)
    assert alice_conv is not None
    assert alice_conv["unread_count"] >= 1

    # 6. Bob opens conversation thread with Alice -> marks unread as read
    thread_res = client.get("/api/chat/conversations/1", headers=bob_headers)
    assert thread_res.status_code == 200
    thread = thread_res.json()
    assert len(thread) >= 2
    # Verify latest message from Alice is now read
    latest_alice_msg = next((m for m in reversed(thread) if m["sender_id"] == 1), None)
    assert latest_alice_msg is not None
    assert latest_alice_msg["is_read"] is True


def test_community_lounge_chat():
    # 1. Login as Alice
    alice_login = client.post("/api/auth/login", json={"email": "alice@skillbridge.dev", "password": "pass123"})
    assert alice_login.status_code == 200
    token = alice_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get public channels
    chan_res = client.get("/api/chat/community/channels")
    assert chan_res.status_code == 200
    channels = chan_res.json()
    assert len(channels) >= 3
    assert any(c["id"] == "general" for c in channels)

    # 3. Read messages in global lounge
    msgs_res = client.get("/api/chat/community/messages?channel=general")
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()
    assert len(msgs) >= 2

    # 4. Post message to global lounge
    new_msg = {
        "channel": "general",
        "content": "Excited to collaborate with all learners on SkillBridge!"
    }
    post_res = client.post("/api/chat/community/messages", json=new_msg, headers=headers)
    assert post_res.status_code == 201
    created_data = post_res.json()
    assert created_data["content"] == new_msg["content"]
    assert created_data["channel"] == "general"
    assert created_data["sender"]["display_name"] == "Alice_CppMaster"

    # 5. Fetch users directory for 1-click chatting with anyone
    dir_res = client.get("/api/chat/users-directory", headers=headers)
    assert dir_res.status_code == 200
    users = dir_res.json()
    assert len(users) >= 4
    bob_user = next((u for u in users if u["id"] == 2), None)
    assert bob_user is not None
    assert bob_user["display_name"] == "JavaGuru_Bob"


def test_support_services():
    # 1. Fetch FAQs
    faq_res = client.get("/api/support/faq")
    assert faq_res.status_code == 200
    faqs = faq_res.json()
    assert len(faqs) >= 4
    assert any("Escrow" in f["question"] for f in faqs)

    # 2. Login as Bob
    login_res = client.post("/api/auth/login", json={"email": "bob@skillbridge.dev", "password": "pass123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Support Ticket
    ticket_data = {
        "category": "Barter Swap",
        "subject": "Inquiry about scheduling reminders for mutual barter sessions",
        "message": "Does SkillBridge send calendar invitations once both parties accept a barter swap?",
        "contact_email": "bob@skillbridge.dev",
        "priority": "NORMAL"
    }
    create_res = client.post("/api/support/tickets", json=ticket_data, headers=headers)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["subject"] == ticket_data["subject"]
    assert created["status"] == "OPEN"

    # 4. Fetch my support tickets
    my_tickets = client.get("/api/support/tickets", headers=headers)
    assert my_tickets.status_code == 200
    tickets = my_tickets.json()
    assert len(tickets) >= 1
    assert any(t["subject"] == ticket_data["subject"] for t in tickets)
