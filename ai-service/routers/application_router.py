"""
Application Writer API Router
Endpoints for AI-powered cover letter generation and application tips
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging
import httpx
import os

from services.application import get_application_writer_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/application", tags=["application"])

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")


class JobInfo(BaseModel):
    """Job posting information"""
    jobId: str
    title: str
    company: str
    description: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None


class GenerateCoverLetterRequest(BaseModel):
    """Request model for cover letter generation"""
    userId: int
    jobInfo: JobInfo
    style: str = "professional"  # professional, passionate, creative


class GetTipsRequest(BaseModel):
    """Request model for getting application tips"""
    userId: int
    jobInfo: JobInfo


class ReviewCoverLetterRequest(BaseModel):
    """Request model for cover letter review"""
    userId: Optional[int] = None
    coverLetter: str
    jobInfo: JobInfo


async def get_user_profile(user_id: int) -> Dict[str, Any]:
    """Fetch user profile from backend"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get profile analysis
            response = await client.get(f"{BACKEND_BASE_URL}/api/profiles/{user_id}/analysis")
            if response.status_code == 200:
                analysis = response.json()
            else:
                analysis = {}

            # Get user profile
            profile_response = await client.get(f"{BACKEND_BASE_URL}/api/profiles/{user_id}")
            if profile_response.status_code == 200:
                profile = profile_response.json()
            else:
                profile = {}

            return {
                "analysis": analysis,
                "profile": profile,
                "userId": user_id
            }
    except Exception as e:
        logger.error(f"Failed to fetch user profile: {e}")
        return {"userId": user_id}


@router.post("/generate-cover-letter")
async def generate_cover_letter(request: GenerateCoverLetterRequest):
    """
    Generate a personalized cover letter based on user profile and job posting

    - **userId**: User's ID for fetching profile data
    - **jobInfo**: Job posting information
    - **style**: Writing style (professional, passionate, creative)
    """
    try:
        # Fetch user profile
        user_profile = await get_user_profile(request.userId)

        if not user_profile.get("analysis") and not user_profile.get("profile"):
            raise HTTPException(
                status_code=400,
                detail="프로필 분석 데이터가 없습니다. 먼저 프로필 분석을 완료해주세요."
            )

        # Generate cover letter
        service = get_application_writer_service()
        result = await service.generate_cover_letter(
            user_profile=user_profile,
            job_info=request.jobInfo.dict(),
            style=request.style
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "자기소개서 생성에 실패했습니다.")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cover letter generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tips")
async def get_application_tips(request: GetTipsRequest):
    """
    Get personalized application tips for a specific job

    - **userId**: User's ID for fetching profile data
    - **jobInfo**: Job posting information
    """
    try:
        # Fetch user profile
        user_profile = await get_user_profile(request.userId)

        # Get tips
        service = get_application_writer_service()
        result = await service.get_application_tips(
            user_profile=user_profile,
            job_info=request.jobInfo.dict()
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "팁 생성에 실패했습니다.")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Application tips error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review")
async def review_cover_letter(request: ReviewCoverLetterRequest):
    """
    Review and provide feedback on a user-written cover letter

    - **userId**: Optional user ID for personalized feedback
    - **coverLetter**: The cover letter text to review
    - **jobInfo**: Job posting information
    """
    try:
        user_profile = None
        if request.userId:
            user_profile = await get_user_profile(request.userId)

        service = get_application_writer_service()
        result = await service.review_cover_letter(
            cover_letter=request.coverLetter,
            job_info=request.jobInfo.dict(),
            user_profile=user_profile
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "피드백 생성에 실패했습니다.")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cover letter review error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
