import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.models.exchange import ExchangeRequest, Review
from app.models.question_bank import InterviewQuestion, QuestionVote
from app.models.company_mentor import CompanyMentorProfile, DirectMentorQuestion
from app.models.chat import ChatMessage, CommunityMessage
from app.models.support import SupportTicket

def seed_database():
    print("Initializing database tables...")
    init_db()
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding Master Skills...")
        skills_data = [
            ("C++ Programming", "Programming", "Modern C++ (C++17/20), STL, memory management, pointers, and performance optimization."),
            ("Java Core & Spring Boot", "Programming", "Enterprise Java, multithreading, Spring Boot, REST APIs, and JPA/Hibernate."),
            ("Python & FastAPI", "Programming", "Modern Python 3.12+, asynchronous programming, Pydantic, and high-performance FastAPI backends."),
            ("System Design & Architecture", "System Design", "Scalability, microservices, load balancing, caching (Redis), CAP theorem, and database sharding."),
            ("Data Structures & Algorithms", "Interview Prep", "Trees, graphs, dynamic programming, backtracking, and algorithmic complexity analysis."),
            ("Docker & Kubernetes", "Cloud & DevOps", "Containerization, multi-stage builds, Pods, Services, Ingress, and Helm charts."),
            ("SQL & Relational Databases", "Database", "Complex joins, indexing, query optimization, ACID transactions, and MySQL internals."),
            ("Graphic Design & UI/UX", "Design", "Figma wireframing, design systems, visual hierarchy, and modern product UI design."),
            ("Video Editing & Motion Graphics", "Creative & Media", "Premiere Pro, After Effects, keyframing, audio mixing, and storytelling."),
            ("Behavioral & Leadership Principles", "Interview Prep", "STAR method, Amazon leadership principles, conflict resolution, and behavioral excellence.")
        ]
        
        skill_map = {}
        for name, category, desc in skills_data:
            skill = Skill(name=name, category=category, description=desc)
            db.add(skill)
            db.flush()
            skill_map[name] = skill

        print("Seeding Users...")
        # 1. Alice - Knows C++, wants to learn Java (Barter, Public details with phone & email shown)
        alice = User(
            email="alice@skillbridge.dev",
            full_name="Alice Chen",
            display_name="Alice_CppMaster",
            hashed_password=get_password_hash("pass123"),
            phone="+1-555-0101",
            bio="Software Developer passionate about low-level systems and high-frequency algorithms.",
            company="FinTech Core",
            job_title="C++ Systems Engineer",
            is_confidential=False,
            show_phone=True,
            show_email=True,
            show_real_name=True,
            show_company=True,
            is_company_verified=True
        )

        # 2. Bob - Knows Java, wants to learn C++ (Barter, hides personal phone & email)
        bob = User(
            email="bob@skillbridge.dev",
            full_name="Bob Smith",
            display_name="JavaGuru_Bob",
            hashed_password=get_password_hash("pass123"),
            phone="+1-555-0102",
            bio="Backend Engineer with 4 years building enterprise microservices in Java Spring Boot.",
            company="Enterprise Soft",
            job_title="Backend Developer",
            is_confidential=False,
            show_phone=False, # Hidden phone
            show_email=False, # Hidden email
            show_real_name=True,
            show_company=True,
            is_company_verified=True
        )

        # 3. Confidential Mentor - Wants identity kept private! Only display name & teaching skill visible
        confidential_user = User(
            email="anonymous_guru@skillbridge.dev",
            full_name="David Vance",
            display_name="StealthArchitect_99",
            hashed_password=get_password_hash("pass123"),
            phone="+1-555-0199",
            bio="Confidential profile: Senior Architect with 12+ years experience.",
            company="Confidential Tech Inc",
            job_title="Principal Architect",
            is_confidential=True, # Identity hidden!
            is_confidential_teacher=True,
            is_confidential_learner=True,
            show_phone=False,
            show_email=False,
            show_real_name=False,
            show_company=False,
            is_company_verified=True
        )

        # 4. Sarah Jenkins - Staff Engineer at Google (Free AMA / Mentorship, shows email only)
        sarah = User(
            email="sarah.google@skillbridge.dev",
            full_name="Sarah Jenkins",
            display_name="Sarah_GoogleL6",
            hashed_password=get_password_hash("pass123"),
            phone="+1-555-0104",
            bio="Staff Engineer at Google working on Search & Large-Scale Distributed Systems. Open for career guidance and interview prep.",
            company="Google",
            job_title="Staff Software Engineer",
            is_confidential=False,
            is_confidential_teacher=False,
            is_confidential_learner=False,
            show_phone=False, # Hidden phone
            show_email=True,  # Shown email
            show_real_name=True,
            show_company=True,
            is_company_verified=True
        )

        # 5. Rahul Sharma - Solutions Architect at Amazon (Paid Mock Interview, shows phone only)
        rahul = User(
            email="rahul.amazon@skillbridge.dev",
            full_name="Rahul Sharma",
            display_name="Rahul_AWS_Architect",
            hashed_password=get_password_hash("pass123"),
            phone="+91-98765-43210",
            bio="Solutions Architect at Amazon AWS. Mentored 200+ candidates for AWS certifications and Amazon SDE loops.",
            company="Amazon",
            job_title="Senior Solutions Architect",
            is_confidential=False,
            is_confidential_teacher=False,
            is_confidential_learner=False,
            show_phone=True,  # Shown phone
            show_email=False, # Hidden email
            show_real_name=True,
            show_company=True,
            is_company_verified=True
        )

        # 6. Maya Lin - Confidential Learner (wants to be taught with identity protected)
        maya = User(
            email="maya.learner@skillbridge.dev",
            full_name="Maya Lin",
            display_name="StealthLearner_Maya",
            hashed_password=get_password_hash("pass123"),
            phone="+1-555-0188",
            bio="Junior Engineer preparing for Senior System Design rounds.",
            company="TechCorp Startup",
            job_title="Associate Software Engineer",
            is_confidential=False, # General profile visible
            is_confidential_teacher=False,
            is_confidential_learner=True, # LEARNER IDENTITY CONFIDENTIAL!
            show_phone=False,
            show_email=False,
            show_real_name=False,
            show_company=False,
            is_company_verified=True
        )

        db.add_all([alice, bob, confidential_user, sarah, rahul, maya])
        db.flush()

        print("Seeding User Skills (Teaching & Learning)...")
        # Alice teaches C++, wants to learn Java
        db.add(UserSkill(
            user_id=alice.id,
            skill_id=skill_map["C++ Programming"].id,
            skill_type="TEACH",
            is_confidential=False, # Public teacher
            proficiency_level="EXPERT",
            explanation_style="Explains with memory diagrams, stack vs heap allocation, pointer visualization, and hands-on coding.",
            years_of_experience=4.5,
            exchange_preference="BARTER_ONLY",
            hourly_rate=0.0,
            currency="USD"
        ))
        db.add(UserSkill(
            user_id=alice.id,
            skill_id=skill_map["Java Core & Spring Boot"].id,
            skill_type="LEARN",
            is_confidential=False, # Public learner
            proficiency_level="BEGINNER",
            learning_goal="Wants to learn Spring Boot microservices, REST annotations, and multithreading.",
            exchange_preference="BARTER_ONLY"
        ))

        # Bob teaches Java, wants to learn C++ (Perfect 2-way Barter Match with Alice!)
        db.add(UserSkill(
            user_id=bob.id,
            skill_id=skill_map["Java Core & Spring Boot"].id,
            skill_type="TEACH",
            is_confidential=False,
            proficiency_level="ADVANCED",
            explanation_style="Focuses on object-oriented architecture, Spring Boot annotations, dependency injection, and clean coding practices.",
            years_of_experience=4.0,
            exchange_preference="BARTER_ONLY",
            hourly_rate=0.0,
            currency="USD"
        ))
        db.add(UserSkill(
            user_id=bob.id,
            skill_id=skill_map["C++ Programming"].id,
            skill_type="LEARN",
            is_confidential=False,
            proficiency_level="BEGINNER",
            learning_goal="Wants to understand low-level memory pointers, cache locality, and game engine math.",
            exchange_preference="BARTER_ONLY"
        ))

        # Maya Lin wants to be taught System Design, keeping her learner identity confidential!
        db.add(UserSkill(
            user_id=maya.id,
            skill_id=skill_map["System Design & Architecture"].id,
            skill_type="LEARN",
            is_confidential=True, # Confidential learner!
            proficiency_level="INTERMEDIATE",
            learning_goal="Needs guidance on distributed rate-limiting, Redis caching topologies, and CAP theorem trade-offs.",
            exchange_preference="BOTH"
        ))

        # Confidential User teaches Python & FastAPI (Paid mentorship)
        db.add(UserSkill(
            user_id=confidential_user.id,
            skill_id=skill_map["Python & FastAPI"].id,
            skill_type="TEACH",
            is_confidential=True, # Confidential teacher!
            proficiency_level="EXPERT",
            explanation_style="Step-by-step breakdown of asynchronous event loops, Pydantic schemas, and JWT security pipelines.",
            years_of_experience=8.0,
            exchange_preference="PAID_ONLY",
            hourly_rate=30.0,
            currency="USD"
        ))

        # Sarah teaches System Design (Free volunteer)
        db.add(UserSkill(
            user_id=sarah.id,
            skill_id=skill_map["System Design & Architecture"].id,
            skill_type="TEACH",
            proficiency_level="EXPERT",
            explanation_style="Teaches high-level distributed systems using interactive architecture diagrams, capacity estimations, and bottleneck analysis.",
            years_of_experience=9.0,
            exchange_preference="VOLUNTEER_FREE",
            hourly_rate=0.0,
            currency="USD"
        ))

        # Rahul teaches Docker & DevOps and charges for intensive tutoring
        db.add(UserSkill(
            user_id=rahul.id,
            skill_id=skill_map["Docker & Kubernetes"].id,
            skill_type="TEACH",
            proficiency_level="EXPERT",
            explanation_style="Hands-on terminal-based instruction, containerizing production backends, CI/CD pipelines, and cloud hosting.",
            years_of_experience=6.5,
            exchange_preference="BOTH",
            hourly_rate=25.0,
            currency="USD"
        ))
        db.flush()

        print("Seeding Company Mentors...")
        sarah_mentor = CompanyMentorProfile(
            user_id=sarah.id,
            company_name="Google",
            job_title="Staff Software Engineer",
            department="Cloud & Infrastructure",
            years_of_experience=9.0,
            can_give_referral=True,
            mock_interview_available=True,
            hourly_fee=0.0, # FREE AMA & Mentorship!
            currency="USD",
            topics_open_for_questions="Google L4/L5 Technical Interviews, Distributed Consensus, Go/C++, Resume Reviews",
            is_active=True
        )

        rahul_mentor = CompanyMentorProfile(
            user_id=rahul.id,
            company_name="Amazon",
            job_title="Senior Solutions Architect",
            department="AWS Enterprise Services",
            years_of_experience=6.5,
            can_give_referral=True,
            mock_interview_available=True,
            hourly_fee=25.0, # Demands $25/hr
            currency="USD",
            topics_open_for_questions="AWS Architecture, Amazon Leadership Principles (LP), System Design rounds, Mock Interviews",
            is_active=True
        )
        db.add_all([sarah_mentor, rahul_mentor])
        db.flush()

        print("Seeding Company Training & Interview Question Bank...")
        questions = [
            InterviewQuestion(
                company_name="Google",
                role="Software Engineer (L4/L5)",
                category="System Design",
                round_type="System Design Round",
                difficulty="Hard",
                question_text="Design a distributed rate limiter that can handle 1,000,000 requests per second across multi-region data centers.",
                answer_explanation=(
                    "**Solution & Architecture Strategy:**\n\n"
                    "1. **Algorithm Choice:** Use the **Token Bucket** or **Sliding Window Counter** algorithm.\n"
                    "2. **Storage Tier:** In-memory distributed store such as Redis clusters with Redis Cells / Lua scripts for atomic increment and check operations.\n"
                    "3. **Race Condition Prevention:** Utilize Redis Lua scripting to execute the read-and-decrement atomically in a single network roundtrip.\n"
                    "4. **Multi-Region Sync:** Local caching with asynchronous batch synchronization to avoid inter-region cross-datacenter latency bottlenecks.\n"
                    "5. **Fallback:** Soft-fail to allow traffic rather than blocking users if the rate-limiter cluster degrades."
                ),
                tags="system-design, redis, rate-limiter, distributed-systems",
                upvotes_count=42,
                author_id=sarah.id
            ),
            InterviewQuestion(
                company_name="Amazon",
                role="Software Development Engineer (SDE-1/2)",
                category="Data Structures & Algorithms",
                round_type="Technical Coding Round",
                difficulty="Medium",
                question_text="Given an array of meeting time intervals consisting of start and end times [[s1,e1],[s2,e2],...], find the minimum number of conference rooms required.",
                answer_explanation=(
                    "**Solution & Approach:**\n\n"
                    "1. **Chronological Ordering / Two Pointer Technique:**\n"
                    "   - Extract all start times and end times into two separate sorted arrays.\n"
                    "   - Iterate through start times: if `start[i] < end[j]`, a room is occupied (`rooms_needed += 1`).\n"
                    "   - Otherwise, an existing meeting ended, increment `j` and decrement `rooms_needed`.\n"
                    "2. **Min-Heap Approach:**\n"
                    "   - Sort intervals by start time.\n"
                    "   - Push end times into a min-heap. If current start >= heap top, pop root (room reused). Push new end time.\n"
                    "3. **Complexity:** Time $O(N \\log N)$, Space $O(N)$."
                ),
                tags="dsa, sorting, heap, two-pointers, intervals",
                upvotes_count=35,
                author_id=rahul.id
            ),
            InterviewQuestion(
                company_name="Microsoft",
                role="Software Engineer",
                category="Core Computer Science",
                round_type="Technical Round 1",
                difficulty="Medium",
                question_text="Explain the four necessary Coffman conditions for a Deadlock to occur in an operating system, and how to prevent them in multi-threaded programs.",
                answer_explanation=(
                    "**Coffman Conditions:**\n\n"
                    "1. **Mutual Exclusion:** At least one resource must be held in a non-shareable mode.\n"
                    "2. **Hold and Wait:** A process must be holding at least one resource and waiting for additional resources held by other processes.\n"
                    "3. **No Preemption:** Resources cannot be forcibly preempted from a process.\n"
                    "4. **Circular Wait:** A closed chain of processes exists where each process holds a resource that the next process in the chain requires.\n\n"
                    "**Prevention Strategies:**\n"
                    "- Enforce strict global resource ordering (lock hierarchies) to break circular wait.\n"
                    "- Use timeouts / try-lock (`std::try_lock` or `pthread_mutex_trylock`) rather than blocking indefinitely."
                ),
                tags="operating-systems, multithreading, concurrency, deadlock",
                upvotes_count=28,
                author_id=alice.id
            ),
            InterviewQuestion(
                company_name="TCS",
                role="Digital Software Engineer",
                category="Java & OOP",
                round_type="Corporate Training & Interview Assessment",
                difficulty="Easy",
                question_text="Explain Java Garbage Collection mechanisms, generational hypothesis, and the difference between G1GC and ZGC.",
                answer_explanation=(
                    "**Explanation:**\n\n"
                    "1. **Weak Generational Hypothesis:** Most objects die young (Eden & Survivor spaces). Surviving objects are promoted to Tenured/Old generation.\n"
                    "2. **G1GC (Garbage-First):** Divides heap into equal-sized regions. Prioritizes collecting regions with the most garbage ('garbage-first'). Target pause time model.\n"
                    "3. **ZGC (Z Garbage Collector):** Ultra-low latency collector (< 1ms pause times) using colored pointers and load barriers to perform memory compaction concurrently while application threads execute."
                ),
                tags="java, jvm, garbage-collection, tcs-training",
                upvotes_count=19,
                author_id=bob.id
            ),
            InterviewQuestion(
                company_name="Infosys",
                role="Specialist Programmer",
                category="Relational Databases & SQL",
                round_type="Technical Assessment & Training",
                difficulty="Medium",
                question_text="Write an optimized SQL query using CTE and Window Functions to find the 2nd and 3rd highest salary in each department.",
                answer_explanation=(
                    "**SQL Query with DENSE_RANK():**\n\n"
                    "```sql\n"
                    "WITH RankedSalaries AS (\n"
                    "    SELECT \n"
                    "        department_id,\n"
                    "        employee_id,\n"
                    "        salary,\n"
                    "        DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rnk\n"
                    "    FROM employees\n"
                    ")\n"
                    "SELECT department_id, employee_id, salary, rnk\n"
                    "FROM RankedSalaries\n"
                    "WHERE rnk IN (2, 3);\n"
                    "```\n\n"
                    "**Why DENSE_RANK()?** It handles ties correctly without skipping rank numbers, ensuring accurate department top tier extraction."
                ),
                tags="sql, window-functions, cte, database, infosys-exam",
                upvotes_count=24,
                author_id=confidential_user.id
            )
        ]
        db.add_all(questions)
        db.flush()

        print("Seeding Direct Mentor Questions...")
        direct_q1 = DirectMentorQuestion(
            mentor_user_id=sarah.id,
            asker_user_id=alice.id,
            title="How to transition from C++ game dev to Distributed Systems at Google?",
            question_text="Hi Sarah, I have 4 years of experience writing C++ for low-latency graphics and simulation engines. How well do these skills translate to Google L4/L5 infrastructure roles, and what distributed systems topics should I focus on?",
            mentor_response="Hi Alice! Low-level C++ skills (memory layouts, cache coherency, concurrency primitives) are in exceptionally high demand in Google Cloud, Search infra, and Kernel teams. To bridge the gap, focus on distributed consensus (Raft/Paxos), RPC frameworks (gRPC/Protobuf), and read the Google Spanner & Bigtable papers. Feel free to book a free mock interview session on my profile!",
            status="ANSWERED",
            is_private=False,
            answered_at=datetime.now(timezone.utc)
        )

        direct_q2 = DirectMentorQuestion(
            mentor_user_id=rahul.id,
            asker_user_id=bob.id,
            title="How strictly are Amazon Leadership Principles weighed in technical loops?",
            question_text="Hi Rahul, for Amazon SDE-2 interviews, how much time is devoted to LP vs coding? Do you have tips for structuring behavioral answers?",
            mentor_response="Hi Bob! Amazon weighs LP equal to coding! Every interviewer has 2 assigned LPs (e.g., Customer Obsession, Ownership, Bias for Action). Always structure your stories with STAR (Situation, Task, Action, Result) with quantified metrics (e.g. reduced latency by 35%).",
            status="ANSWERED",
            is_private=False,
            answered_at=datetime.now(timezone.utc)
        )
        db.add_all([direct_q1, direct_q2])
        db.flush()

        print("Seeding Sample Skill Exchanges (Barter & Paid)...")
        # Alice & Bob Barter: C++ for Java!
        barter_ex = ExchangeRequest(
            sender_id=alice.id,
            receiver_id=bob.id,
            exchange_type="BARTER",
            sender_offered_skill_id=skill_map["C++ Programming"].id,
            receiver_requested_skill_id=skill_map["Java Core & Spring Boot"].id,
            monetary_amount=0.0,
            currency="USD",
            payment_status="NOT_APPLICABLE",
            status="ACCEPTED",
            session_details="Barter exchange: 2 hours of C++ pointers & memory management in exchange for 2 hours of Java Spring Boot microservice design."
        )

        # Alice requests paid tutoring from Confidential Mentor
        paid_ex = ExchangeRequest(
            sender_id=alice.id,
            receiver_id=confidential_user.id,
            exchange_type="PAID_ONE_WAY",
            sender_offered_skill_id=None,
            receiver_requested_skill_id=skill_map["Python & FastAPI"].id,
            monetary_amount=30.0,
            currency="USD",
            payment_status="PAID_ESCROW",
            status="IN_PROGRESS",
            session_details="1-on-1 tutoring on building high-performance FastAPI backends with async SQLAlchemy."
        )
        db.add_all([barter_ex, paid_ex])
        db.flush()

        print("Seeding Sample Direct Chat Messages between peers and mentors...")
        # 1. Chat between Alice (C++ Teacher) and Bob (Java Teacher)
        chat1 = ChatMessage(
            sender_id=alice.id,
            receiver_id=bob.id,
            content="Hi Bob! I noticed from the Barter Matcher that you want to learn C++ memory pointers, and you teach Java Spring Boot. Would you like to do a 2-hour swap?",
            is_read=True,
            created_at=datetime.now(timezone.utc)
        )
        chat2 = ChatMessage(
            sender_id=bob.id,
            receiver_id=alice.id,
            content="Hey Alice! Absolutely! We have a microservice that is hitting GC pauses, so understanding cache-friendly C++ data structures will really help.",
            is_read=True,
            created_at=datetime.now(timezone.utc)
        )
        chat3 = ChatMessage(
            sender_id=alice.id,
            receiver_id=bob.id,
            content="Awesome! I've accepted our barter swap proposal. Let's schedule our first session this Saturday.",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )

        # 2. Chat between Maya (Confidential Learner) and Rahul (Amazon Mentor)
        chat4 = ChatMessage(
            sender_id=maya.id,
            receiver_id=rahul.id,
            content="Hello Rahul! I saw your mentor profile on SkillBridge. Could we do an AWS Solutions Architect mock interview next week?",
            is_read=True,
            created_at=datetime.now(timezone.utc)
        )
        chat5 = ChatMessage(
            sender_id=rahul.id,
            receiver_id=maya.id,
            content="Hi Maya! Yes, of course. Please review the AWS Well-Architected Framework whitepaper, and prepare your STAR format answers before we start.",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )

        db.add_all([chat1, chat2, chat3, chat4, chat5])
        db.flush()

        print("Seeding Public Community Lounge Messages (Global Chatting Place)...")
        # Global Lobby
        comm1 = CommunityMessage(
            sender_id=alice.id,
            channel="general",
            content="Welcome to the SkillBridge Community Lounge! 👋 Excited to connect with fellow devs and trade knowledge.",
            created_at=datetime.now(timezone.utc)
        )
        comm2 = CommunityMessage(
            sender_id=bob.id,
            channel="general",
            content="Hey everyone! Looking forward to trading Java Spring Boot knowledge for modern C++ pointers.",
            created_at=datetime.now(timezone.utc)
        )
        comm3 = CommunityMessage(
            sender_id=sarah.id,
            channel="general",
            content="Hello everyone! Sarah here from Google. Feel free to ping me for distributed systems & backend career advice!",
            created_at=datetime.now(timezone.utc)
        )
        comm4 = CommunityMessage(
            sender_id=rahul.id,
            channel="general",
            content="Greetings! Rahul from AWS. If anyone has questions on AWS architectures or Amazon loops, drop a message in #interview-prep or DM me.",
            created_at=datetime.now(timezone.utc)
        )
        comm5 = CommunityMessage(
            sender_id=maya.id,
            channel="general",
            content="Hi everyone! Preparing for system design rounds. Love the community vibe here!",
            created_at=datetime.now(timezone.utc)
        )

        # Code & Tech
        comm6 = CommunityMessage(
            sender_id=alice.id,
            channel="code-and-tech",
            content="C++ Tip of the day: Use `std::span` (C++20) for bounds-safe array viewing without dynamic allocation overhead!",
            created_at=datetime.now(timezone.utc)
        )
        comm7 = CommunityMessage(
            sender_id=bob.id,
            channel="code-and-tech",
            content="Java 21 Virtual Threads (Loom) are game changers for high-throughput microservices. Anyone benchmarking them in prod?",
            created_at=datetime.now(timezone.utc)
        )

        # Interview Prep
        comm8 = CommunityMessage(
            sender_id=rahul.id,
            channel="interview-prep",
            content="Amazon Tip: For Leadership Principles, have at least two well-rehearsed STAR stories per LP with quantified impact (e.g. reduced latency by 35%).",
            created_at=datetime.now(timezone.utc)
        )
        comm9 = CommunityMessage(
            sender_id=sarah.id,
            channel="interview-prep",
            content="Google System Design: Spend the first 5 minutes clarifying non-functional requirements (p99 latency, read/write ratio, consistency vs availability).",
            created_at=datetime.now(timezone.utc)
        )

        # Barter Hub
        comm10 = CommunityMessage(
            sender_id=alice.id,
            channel="barter-hub",
            content="[Barter Offer] Offering: 2 hours of C++ STL & Memory Management. Looking for: Spring Boot Microservices. Who is interested?",
            created_at=datetime.now(timezone.utc)
        )

        db.add_all([comm1, comm2, comm3, comm4, comm5, comm6, comm7, comm8, comm9, comm10])
        db.flush()

        print("Seeding Sample Support Tickets...")
        ticket1 = SupportTicket(
            user_id=alice.id,
            category="Escrow & Payments",
            subject="Question regarding escrow release timeline",
            message="Hi Support team! When a paid tutoring session is completed, how long does the escrow release take to reflect in the teacher account?",
            contact_email="alice@skillbridge.dev",
            status="RESOLVED",
            priority="NORMAL"
        )
        ticket2 = SupportTicket(
            user_id=maya.id,
            category="Privacy & Confidentiality",
            subject="Verification that my company name is hidden from teachers",
            message="I am preparing for Senior System Design rounds and want to ensure my current employer remains 100% confidential. Can you confirm the masking is active?",
            contact_email="maya.learner@skillbridge.dev",
            status="OPEN",
            priority="NORMAL"
        )
        db.add_all([ticket1, ticket2])
        db.commit()

        print("Database successfully seeded with realistic SkillBridge demo data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

