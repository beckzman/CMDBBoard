from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db.models import ConfigurationItem, Relationship
from app.core.config import settings
import requests
import json
import logging
import os

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])

class AIQueryRequest(BaseModel):
    query: str
    model: str = "llama3.1" # Default model

class AIQueryResponse(BaseModel):
    answer: str

def get_filtered_context(db: Session, query: str) -> str:
    """
    Fetches CIs based on simple keyword matching from the query.
    Limits results to 30 items for local inference context.
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
        if ci.name.lower() in query_lower:
            score += 10
        if ci.ci_type.value.lower() in query_lower:
            score += 5
        if ci.location and ci.location.lower() in query_lower:
            score += 3
        if ci.environment and ci.environment.lower() in query_lower:
            score += 3
        
        if score > 0:
            relevant_cis.append((score, ci))
    
    # 3. Fill up to limit
    # Get limit from environment (default to 30 for safety, but user can increase)
    try:
        limit = int(os.getenv("AI_CONTEXT_LIMIT", "30"))
    except ValueError:
        limit = 30

    # If we haven't reached the limit yet, fill with remaining items
    if len(relevant_cis) < limit:
        # Create a set of IDs already included
        included_ids = {item[1].id for item in relevant_cis}
        
        for ci in all_cis:
            if len(relevant_cis) >= limit:
                break
            
            if ci.id not in included_ids:
                # Add with low score (1) so they appear after matches
                relevant_cis.append((1, ci))
        
    # 4. Sort and limit (Sort by score DESC)
    relevant_cis.sort(key=lambda x: x[0], reverse=True)
    top_cis = [item[1] for item in relevant_cis[:limit]]

    # 5. Build String
    context_lines = [f"Here is the context (Top {len(top_cis)} CIs):"]
    
    for ci in top_cis:
        info = f"- CI: {ci.name} (Type: {ci.ci_type.value}, Status: {ci.status.value})"
        if ci.environment:
            info += f", Env: {ci.environment}"
        if ci.location:
            info += f", Loc: {ci.location}"
        
        # Extended Attributes
        extras = []
        if ci.department: extras.append(f"Dept: {ci.department}")
        if ci.contact: extras.append(f"Contact: {ci.contact}")
        if ci.service_provider: extras.append(f"Provider: {ci.service_provider}")
        if ci.cost_center: extras.append(f"CostCenter: {ci.cost_center}")
        if ci.sla: extras.append(f"SLA: {ci.sla}")
        if ci.domain: extras.append(f"Domain: {ci.domain}")
        if ci.description: extras.append(f"Desc: {ci.description}")
        
        # Technical Details (JSON) - Include snippets if relevant?
        # For now, keeping it simple to avoid massive context
        
        if extras:
            info += f", {', '.join(extras)}"
        
        if ci.relationships_summary:
            rel_summary = ci.relationships_summary
            if len(rel_summary) > 100:
                rel_summary = rel_summary[:100] + "..."
            info += f". Rels: {rel_summary}"
        
        context_lines.append(info)
        
    return "\n".join(context_lines)

@router.post("/query", response_model=AIQueryResponse)
def query_ai(request: AIQueryRequest, db: Session = Depends(get_db)):
    """
    Queries the Local Ollama AI about the CMDB.
    """
    # Ollama Service URL (from docker-compose)
    ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")

    try:
        # 1. Get Context
        context = get_filtered_context(db, request.query)
        
        # 2. Construct Prompt
        prompt = f"""
        You are a CMDB Assistant.
        Context:
        {context}

        Question: {request.query}

        Instructions:
        - Answer based ONLY on the Context.
        - Be concise.
        """
        
        # 3. Call Ollama
        payload = {
            "model": request.model,
            "prompt": prompt,
            "stream": False
        }
        
        logger.info(f"Sending request to Ollama ({ollama_url})...")
        # Local LLMs can be slow on CPU with large context (1300 items), increasing timeout to 10 minutes
        response = requests.post(ollama_url, json=payload, timeout=600)
        
        if response.status_code != 200:
            error_detail = response.text
            logger.error(f"Ollama Error: {response.status_code} - {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama Error: {error_detail}"
            )
            
        data = response.json()
        return {"answer": data.get("response", "")}

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to Ollama. Ensure the 'ollama' container is running."
        )
    except Exception as e:
        logger.error(f"AI Query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Service Error: {str(e)}"
        )
