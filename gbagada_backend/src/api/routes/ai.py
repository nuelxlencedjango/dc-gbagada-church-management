from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os

from src.config.database import get_db
from src.services.auth import AuthService
from src.services.rag_service import RAGService

router = APIRouter()

class AIQuery(BaseModel):
    question: str
    context: Optional[dict] = None

class AIResponse(BaseModel):
    answer: str
    source: str = "groq_rag"

@router.post("/chat", response_model=AIResponse)
async def chat_with_ai(
    query: AIQuery,
    token: str,
    db: Session = Depends(get_db)
):
    """Chat with the AI assistant using Groq"""
    auth_service = AuthService(db)
    user = auth_service.get_current_user(token)
    
    rag_service = RAGService()
    
    # Get user context
    user_context = {
        "role": user.role,
        "name": user.full_name,
        "user_id": user.id
    }
    
    # Check if query is about church info (fast path)
    query_lower = query.question.lower()
    
    # Fast path for common queries (no RAG needed)
    if "service time" in query_lower or "service times" in query_lower:
        return AIResponse(
            answer="Sunday services are at 9 AM and 11 AM. Tuesday prayer meeting is at 6 PM.",
            source="system"
        )
    elif "contact" in query_lower or "phone" in query_lower:
        return AIResponse(
            answer=f"You can reach us at {os.getenv('CHURCH_PHONE', '+234-XXX-XXX-XXXX')} or email {os.getenv('CHURCH_EMAIL', 'info@dominioncitygbagada.com')}",
            source="system"
        )
    elif "pastor" in query_lower:
        return AIResponse(
            answer="Our Branch Pastor is available for guidance and support. Please contact the church office for an appointment.",
            source="system"
        )
    elif "location" in query_lower or "address" in query_lower:
        return AIResponse(
            answer="Dominion City Gbagada is located at Gbagada, Lagos, Nigeria.",
            source="system"
        )
    
    # For complex queries, use RAG with Groq
    try:
        answer = rag_service.query(query.question, user_context)
        return AIResponse(answer=answer, source="groq_rag")
    except Exception as e:
        print(f"AI Error: {e}")
        return AIResponse(
            answer="I apologize, but I'm having trouble answering that right now. Please try again later or contact the church office.",
            source="error"
        )

@router.post("/update-knowledge")
async def update_knowledge(
    token: str,
    db: Session = Depends(get_db)
):
    """Update the AI's knowledge from church sources"""
    auth_service = AuthService(db)
    user = auth_service.get_current_user(token)
    
    # Only admins can update knowledge
    if user.role not in ["admin", "super_admin", "pastor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and pastors can update the knowledge base"
        )
    
    rag_service = RAGService()
    
    # Scrape HQ website
    hq_success = rag_service.scrape_church_hq()
    
    return {
        "message": "Knowledge base updated successfully",
        "hq_website_scraped": hq_success,
        "status": "completed"
    }

@router.get("/church-info")
async def get_church_info(info_type: str):
    """Get specific church information"""
    rag_service = RAGService()
    info = rag_service.get_church_info(info_type)
    return {"info": info}
@router.post("/public-chat")
async def public_chat(query: AIQuery):
    """Public AI chat - No authentication required"""
    rag_service = RAGService()
    
    # Check if query is about church info (fast path)
    query_lower = query.question.lower()
    
    # Fast path for common queries (no RAG needed)
    if "service time" in query_lower or "service times" in query_lower:
        return AIResponse(
            answer="Sunday services are at 9 AM and 11 AM. Tuesday prayer meeting is at 6 PM.",
            source="system"
        )
    elif "contact" in query_lower or "phone" in query_lower:
        return AIResponse(
            answer=f"You can reach us at {os.getenv('CHURCH_PHONE', '+234-XXX-XXX-XXXX')} or email {os.getenv('CHURCH_EMAIL', 'info@dominioncitygbagada.com')}",
            source="system"
        )
    elif "pastor" in query_lower:
        return AIResponse(
            answer="Our Branch Pastor is available for guidance and support. Please contact the church office for an appointment.",
            source="system"
        )
    elif "location" in query_lower or "address" in query_lower:
        return AIResponse(
            answer="Dominion City Gbagada is located at Gbagada, Lagos, Nigeria.",
            source="system"
        )
    elif "join" in query_lower or "member" in query_lower or "membership" in query_lower:
        return AIResponse(
            answer="To become a member of Dominion City Gbagada, please click the 'Join Our Family' button on our website or visit us at our church location. We would love to welcome you!",
            source="system"
        )
    elif "prayer" in query_lower:
        return AIResponse(
            answer="We have prayer meetings every Tuesday at 6 PM. You can also submit prayer requests through our website or contact the church office.",
            source="system"
        )
    elif "announcement" in query_lower:
        return AIResponse(
            answer="Please check our Announcements section on the website for the latest church news and events.",
            source="system"
        )
    
    # For complex queries, use RAG
    try:
        answer = rag_service.query(query.question, None)
        return AIResponse(answer=answer, source="groq_rag")
    except Exception as e:
        print(f"AI Error: {e}")
        return AIResponse(
            answer="I apologize, but I'm having trouble answering that right now. Please try again later or contact the church office directly.",
            source="error"
        )
