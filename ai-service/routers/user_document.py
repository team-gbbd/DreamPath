from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserInput(BaseModel):
    personalityTraits: Optional[str] = ''
    values: Optional[str] = ''
    emotions: Optional[str] = ''
    interests: Optional[str] = ''
    identityText: Optional[str] = ''

class DocumentResponse(BaseModel):
    document: str

@router.post('/make-document', response_model=DocumentResponse)
def make_document(input: UserInput):
    parts = [
        f"[성격 특성]\n{input.personalityTraits}",
        f"[가치관]\n{input.values}",
        f"[감정 패턴]\n{input.emotions}",
        f"[관심사]\n{input.interests}",
        f"[AI 에이전트 Identity]\n{input.identityText}"
    ]

    document = '\n\n'.join([p for p in parts if p.strip()])

    return DocumentResponse(document=document)
