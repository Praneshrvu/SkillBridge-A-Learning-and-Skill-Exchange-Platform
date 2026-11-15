from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.api.deps import get_current_user_optional
from app.models.user import User
from app.models.exchange import ExchangeRequest
from app.schemas.course import CourseResourcesResponse, CourseModule, ReferenceVideo, SpecialResource

router = APIRouter(prefix="/courses", tags=["Course Reference Videos & Paid Learner Resources"])

COURSE_CATALOG = [
    CourseModule(
        id="cpp-systems",
        skill_name="C++ Programming & Systems Engineering",
        category="Programming",
        overview="Deep dive into modern C++17/20, manual memory allocation, pointer arithmetic, stack vs heap, RAII, and low-latency systems.",
        reference_videos=[
            ReferenceVideo(
                id="cpp-v1",
                title="C++ Pointers & Memory Layout Explained Visually",
                instructor="Alice Chen (C++ Systems Specialist)",
                duration="18 mins",
                difficulty="Intermediate",
                category="Programming",
                video_url="https://www.youtube-nocookie.com/embed/2ybLD6_2gKM",
                thumbnail_icon="💻",
                summary="Visual walkthrough of stack frames, memory addresses, dereferencing, and avoiding dangling pointer memory leaks.",
                topics=["Stack vs Heap Allocation", "Pointer Arithmetic", "Memory Leaks", "Valgrind Profiling"]
            ),
            ReferenceVideo(
                id="cpp-v2",
                title="C++ STL Vectors, Maps & Cache Locality",
                instructor="FinTech High-Frequency Team",
                duration="22 mins",
                difficulty="Advanced",
                category="Programming",
                video_url="https://www.youtube-nocookie.com/embed/ryfZksP0wQc",
                thumbnail_icon="⚡",
                summary="Why vector contiguous memory layouts beat linked nodes in modern CPU cache line benchmarks.",
                topics=["Contiguous Memory", "CPU Cache Lines", "Custom Allocators", "Big-O Comparisons"]
            )
        ],
        special_resources=[
            SpecialResource(
                id="res-cpp-1",
                title="C++ Modern Systems & Pointer Architecture Cheat Sheet",
                resource_type="CheatSheet",
                description="Comprehensive 6-page reference covering smart pointers (std::unique_ptr, std::shared_ptr), move semantics, and memory barriers.",
                file_format="PDF & Markdown",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Unlocked for verified paid learners.",
                perk_category="Cheat Sheet",
                is_premium_only=True
            ),
            SpecialResource(
                id="res-cpp-2",
                title="Low-Latency Lock-Free Queue Source Implementation",
                resource_type="Blueprint",
                description="Production-grade C++ ring-buffer implementation with atomic memory ordering and benchmark harness.",
                file_format="Source Code ZIP (.cpp / .hpp)",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Included with 1-on-1 C++ paid mentorship.",
                perk_category="Blueprint",
                is_premium_only=True
            )
        ]
    ),
    CourseModule(
        id="java-spring",
        skill_name="Java Core & Enterprise Spring Boot",
        category="Programming",
        overview="Build production microservices with Spring Boot 3, Spring Data JPA, Hibernate caching, and asynchronous event streams.",
        reference_videos=[
            ReferenceVideo(
                id="java-v1",
                title="Spring Boot Microservices Architecture Masterclass",
                instructor="Bob Smith (Enterprise Architect)",
                duration="25 mins",
                difficulty="Intermediate",
                category="Programming",
                video_url="https://www.youtube-nocookie.com/embed/9SGDpanrc8U",
                thumbnail_icon="☕",
                summary="Designing microservice contracts, dependency injection, and JPA repository abstractions.",
                topics=["Dependency Injection", "REST Controllers", "JPA Entity Relations", "Application Context"]
            ),
            ReferenceVideo(
                id="java-v2",
                title="Java Multithreading & Virtual Threads (Project Loom)",
                instructor="Java Platform Specialists",
                duration="20 mins",
                difficulty="Advanced",
                category="Programming",
                video_url="https://www.youtube-nocookie.com/embed/5UfF1r-3L8c",
                thumbnail_icon="🧵",
                summary="Understanding platform threads vs virtual threads and high-concurrency non-blocking I/O.",
                topics=["Thread Pools", "CompletableFuture", "Virtual Threads", "Synchronization"]
            )
        ],
        special_resources=[
            SpecialResource(
                id="res-java-1",
                title="Enterprise Spring Boot Production Checklist & Tuning Guide",
                resource_type="CheatSheet",
                description="HikariCP connection pool sizing formulas, JVM garbage collection tuning (G1GC), and security headers.",
                file_format="PDF Guide",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Verified paid learner resource.",
                perk_category="Cheat Sheet",
                is_premium_only=True
            ),
            SpecialResource(
                id="res-java-2",
                title="10 Enterprise Spring Technical Mock Interview Scenarios",
                resource_type="ProblemSet",
                description="Real-world system failure questions asked at Fortune 500 enterprise Java technical rounds.",
                file_format="Handout with Model Solutions",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Included with 1-on-1 paid tutoring.",
                perk_category="Problem Set",
                is_premium_only=True
            )
        ]
    ),
    CourseModule(
        id="system-design",
        skill_name="Distributed System Design & Cloud Architecture",
        category="System Design",
        overview="Scalability fundamentals: caching layers (Redis), database sharding, message queues (Kafka), load balancing, and high availability.",
        reference_videos=[
            ReferenceVideo(
                id="sys-v1",
                title="Designing a High-Throughput URL Shortener (TinyURL)",
                instructor="Sarah Jenkins (Google Staff Engineer)",
                duration="24 mins",
                difficulty="Advanced",
                category="System Design",
                video_url="https://www.youtube-nocookie.com/embed/fMZMm_0ZhK4",
                thumbnail_icon="🌐",
                summary="Capacity estimation, Base62 encoding, distributed collision mitigation, and Redis caching layers.",
                topics=["Capacity Estimation", "Base62 Encoding", "Database Partitioning", "Redis Cache-Aside"]
            ),
            ReferenceVideo(
                id="sys-v2",
                title="Database Sharding & Consistent Hashing Visualized",
                instructor="Amazon Principal Solutions Team",
                duration="21 mins",
                difficulty="Advanced",
                category="System Design",
                video_url="https://www.youtube-nocookie.com/embed/zaRkONvyGr8",
                thumbnail_icon="📐",
                summary="How distributed databases partition data across virtual nodes on a hash ring to prevent hotspotting.",
                topics=["Hash Rings", "Virtual Nodes", "Data Replication", "CAP Theorem Tradeoffs"]
            )
        ],
        special_resources=[
            SpecialResource(
                id="res-sys-1",
                title="FAANG System Design Architecture Blueprints Pack",
                resource_type="Blueprint",
                description="Production architecture diagrams for Uber backend, Netflix streaming CDN, and Twitter feed timeline with tradeoffs.",
                file_format="Excalidraw Diagrams & High-Res PNG",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Unlocked for verified paid learners.",
                perk_category="Blueprint",
                is_premium_only=True
            ),
            SpecialResource(
                id="res-sys-2",
                title="System Design Math & Back-of-the-Envelope Estimation Formulas",
                resource_type="CheatSheet",
                description="Latency numbers every programmer should know, QPS calculations, storage estimations, and network throughput charts.",
                file_format="PDF Reference Card",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Included with paid mock architecture sessions.",
                perk_category="Cheat Sheet",
                is_premium_only=True
            )
        ]
    ),
    CourseModule(
        id="python-fastapi",
        skill_name="Python 3.13 & High-Performance FastAPI",
        category="Programming",
        overview="Modern asynchronous backends with FastAPI, Pydantic v2 data validation, SQLAlchemy 2.0 ORM, and OAuth2 JWT authentication.",
        reference_videos=[
            ReferenceVideo(
                id="py-v1",
                title="FastAPI Asynchronous Architecture & Event Loops",
                instructor="StealthArchitect_99 (Python Core Expert)",
                duration="19 mins",
                difficulty="Intermediate",
                category="Programming",
                video_url="https://www.youtube-nocookie.com/embed/0rs7M6CEQ8g",
                thumbnail_icon="🐍",
                summary="How asyncio event loops, coroutines, and threadpool executors work under FastAPI and Uvicorn ASGI.",
                topics=["async/await", "ASGI vs WSGI", "Threadpool Offloading", "Non-blocking Database I/O"]
            )
        ],
        special_resources=[
            SpecialResource(
                id="res-py-1",
                title="Production FastAPI & Pydantic v2 Microservice Template",
                resource_type="Blueprint",
                description="Complete boilerplate with JWT token rotation, bcrypt hashing, BOLA authorization dependencies, and Pytest harness.",
                file_format="GitHub Repository / ZIP",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Unlocked for paid tutoring sessions.",
                perk_category="Blueprint",
                is_premium_only=True
            )
        ]
    ),
    CourseModule(
        id="faang-dsa",
        skill_name="Data Structures & FAANG Algorithmic Patterns",
        category="Interview Prep",
        overview="Master the 14 core coding interview patterns: Two Pointers, Sliding Window, Monotonic Stacks, Graph BFS/DFS, and Dynamic Programming.",
        reference_videos=[
            ReferenceVideo(
                id="dsa-v1",
                title="Top 5 Graph Algorithms Every Engineer Must Know",
                instructor="Competitive Programming Lead",
                duration="28 mins",
                difficulty="Advanced",
                category="Interview Prep",
                video_url="https://www.youtube-nocookie.com/embed/tWVWeAqZ0WU",
                thumbnail_icon="📊",
                summary="Dijkstra's shortest path, Topological Sort (Kahn's), Union-Find (Disjoint Set Union), and Cycle Detection.",
                topics=["Dijkstra Algorithm", "Topological Sort", "Union Find", "Cycle Detection in Directed Graphs"]
            )
        ],
        special_resources=[
            SpecialResource(
                id="res-dsa-1",
                title="FAANG 75 Ultimate Problem Set with Complexity Analysis",
                resource_type="ProblemSet",
                description="Step-by-step optimal solutions, invariants, edge cases, and time/space complexity derivations for the top 75 problems.",
                file_format="PDF eBook & Code Solutions",
                badge_label="⭐ Paid Learner Perk",
                download_hint="Unlocked for verified paid mentorship members.",
                perk_category="Problem Set",
                is_premium_only=True
            )
        ]
    )
]

@router.get("/resources", response_model=CourseResourcesResponse)
def get_course_resources(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get course reference videos and special learning resources.
    Identifies whether the current user has verified paid learner perks.
    """
    is_paid_learner = False
    paid_count = 0

    if current_user:
        # Check if user has participated in any paid tutoring exchange as a student/learner
        paid_exchanges = (
            db.query(ExchangeRequest)
            .filter(
                ExchangeRequest.sender_id == current_user.id,
                ExchangeRequest.monetary_amount > 0,
                or_(
                    ExchangeRequest.payment_status.in_(["PAID_ESCROW", "RELEASED_TO_TEACHER"]),
                    ExchangeRequest.status.in_(["ACCEPTED", "IN_PROGRESS", "COMPLETED"])
                )
            )
            .all()
        )
        paid_count = len(paid_exchanges)
        if paid_count > 0:
            is_paid_learner = True

    return CourseResourcesResponse(
        is_paid_learner=is_paid_learner,
        paid_sessions_count=paid_count,
        modules=COURSE_CATALOG
    )
