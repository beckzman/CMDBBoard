from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db.models import ConfigurationItem, Relationship
from app.core.config import settings
import google.generativeai as genai
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])

class AIQueryRequest(BaseModel):
    query: str

class AIQueryResponse(BaseModel):
    answer: str

def get_full_context(db: Session) -> str:
    """
    Fetches CIs and constructs a context string for the AI.
    Warning: This is a simple implementation. For large CMDBs, this needs RAG (Retrieval Augmented Generation).
    """
    cis = db.query(ConfigurationItem).options(
        joinedload(ConfigurationItem.source_relationships).joinedload(Relationship.target_ci),
        joinedload(ConfigurationItem.target_relationships).joinedload(Relationship.source_ci)
    ).all()

    context_lines = ["Here is the current state of the Configuration Management Database (CMDB):"]
    
    for ci in cis:
        # Basic Info
        info = f"- CI: {ci.name} (Type: {ci.ci_type.value}, Status: {ci.status.value})"
        if ci.environment:
            info += f", Env: {ci.environment}"
        if ci.location:
            info += f", Loc: {ci.location}"
        if ci.os_db_system:
             info += f", OS/DB: {ci.os_db_system}"
        
        # Relationships
        rels = []
        if ci.relationships_summary:
            rels.append(f"Relationships: {ci.relationships_summary}")
        
        line = info
        if rels:
             line += f". {' '.join(rels)}"
        
        context_lines.append(line)
        
    return "\n".join(context_lines)

@router.post("/query", response_model=AIQueryResponse)
def query_ai(request: AIQueryRequest, db: Session = Depends(get_db)):
    """
    Queries the AI about the CMDB.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, 
            detail="AI service is not configured (Missing GEMINI_API_KEY)"
        )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        # 1. Get Context
        context = get_full_context(db)
        
        # 2. Construct Prompt
        prompt = f"""
        You are an intelligent assistant for an ITIL CMDB (Configuration Management Database).
        User Question: "{request.query}"

        Context Data (The actual state of the infrastructure):
        {context}

        Instructions:
        - Answer the user's question based ONLY on the Context Data provided.
        - If the answer is not in the data, say "I don't have enough information in the CMDB to answer that."
        - Be concise and professional.
        - If listing items, use bullet points.
        """
        
        # 3. Call AI
        response = model.generate_content(prompt)
        
        return {"answer": response.text}

    except Exception as e:
        logger.error(f"AI Query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Service Error: {str(e)}"
        )
