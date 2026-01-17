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

def get_filtered_context(db: Session, query: str) -> str:
    """
    Fetches CIs based on simple keyword matching from the query.
    Limits results to 50 items to avoid AI quota limits.
    """
    # 1. Fetch all (simplified for now, ideally filter in DB)
    all_cis = db.query(ConfigurationItem).options(
        joinedload(ConfigurationItem.source_relationships).joinedload(Relationship.target_ci),
        joinedload(ConfigurationItem.target_relationships).joinedload(Relationship.source_ci)
    ).all()
    
    query_lower = query.lower()
    relevant_cis = []
    
    # 2. Simple Keyword Scoring
    for ci in all_cis:
        score = 0
        # Exact name match is high priority
        if ci.name.lower() in query_lower:
            score += 10
        # Type match
        if ci.ci_type.value.lower() in query_lower:
            score += 5
        # Location/Env match
        if ci.location and ci.location.lower() in query_lower:
            score += 3
        if ci.environment and ci.environment.lower() in query_lower:
            score += 3
        
        # Include if score > 0 or if we have few items (fallback)
        if score > 0:
            relevant_cis.append((score, ci))
    
    # 3. Fallback: If no keyword matches, include top 20 recently updated (simulated by list order here)
    if not relevant_cis:
        relevant_cis = [(1, ci) for ci in all_cis[:20]]
        
    # 4. Sort by score and take top 20
    relevant_cis.sort(key=lambda x: x[0], reverse=True)
    top_cis = [item[1] for item in relevant_cis[:20]]

    # 5. Build String
    context_lines = [f"Here is the context (Top {len(top_cis)} relevant CIs based on query):"]
    
    for ci in top_cis:
        # Basic Info
        info = f"- CI: {ci.name} (Type: {ci.ci_type.value}, Status: {ci.status.value})"
        if ci.environment:
            info += f", Env: {ci.environment}"
        if ci.location:
            info += f", Loc: {ci.location}"
        
        # Relationships (Truncated to save tokens)
        if ci.relationships_summary:
            # Truncate to first 100 chars
            rel_summary = ci.relationships_summary
            if len(rel_summary) > 100:
                rel_summary = rel_summary[:100] + "..."
            info += f". Rels: {rel_summary}"
        
        context_lines.append(info)
        
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 1. Get Context with Filtering
        context = get_filtered_context(db, request.query)
        
        # 2. Construct Prompt
        prompt = f"""
        You are an intelligent assistant for an ITIL CMDB.
        User Question: "{request.query}"

        Context Data:
        {context}

        Instructions:
        - Answer based ONLY on the Context Data.
        - If the answer is not in the data, say "I don't have enough information in the CMDB to answer that."
        - Be concise.
        """
        
        # 3. Call AI
        response = model.generate_content(prompt)
        
        return {"answer": response.text}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"AI Query failed: {error_msg}")
        
        if "429" in error_msg:
             return {"answer": "⚠️ Error: AI Quota Exceeded. Please try again later or reduce query complexity."}
             
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Service Error: {error_msg}"
        )
