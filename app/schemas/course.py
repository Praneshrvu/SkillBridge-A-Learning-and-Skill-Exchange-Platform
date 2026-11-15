from typing import List, Optional
from pydantic import BaseModel

class ReferenceVideo(BaseModel):
    id: str
    title: str
    instructor: str
    duration: str
    difficulty: str
    category: str
    video_url: str
    thumbnail_icon: str
    summary: str
    topics: List[str]

class SpecialResource(BaseModel):
    id: str
    title: str
    resource_type: str # CheatSheet, Blueprint, ProblemSet, Roadmap
    description: str
    file_format: str
    badge_label: str
    download_hint: str
    perk_category: str
    is_premium_only: bool

class CourseModule(BaseModel):
    id: str
    skill_name: str
    category: str
    overview: str
    reference_videos: List[ReferenceVideo]
    special_resources: List[SpecialResource]

class CourseResourcesResponse(BaseModel):
    is_paid_learner: bool
    paid_sessions_count: int
    modules: List[CourseModule]
