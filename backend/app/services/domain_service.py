import socket
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, Domain

def resolve_domains_for_cis(db: Session, limit: int = 50):
    """
    Iterates through CIs and attempts to resolve their DNS using active domains.
    Updates the CI domain if resolution is successful.
    """
    stats = {
        "processed": 0,
        "updated": 0,
        "errors": 0,
        "details": []
    }

    try:
        # Get active domains (suffixes)
        domains = db.query(Domain).filter(Domain.is_active == True).all()
        if not domains:
            stats["details"].append("No active domains found.")
            return stats

        if limit and limit > 0:
            cis = db.query(ConfigurationItem).limit(limit).all()
        else:
            cis = db.query(ConfigurationItem).all()
        
        stats["processed"] = len(cis)

        for ci in cis:
            resolved_domain = None
            
            # Try each domain suffix
            for domain in domains:
                fqdn = f"{ci.name}.{domain.name}"
                try:
                    # Try to resolve
                    socket.gethostbyname(fqdn)
                    resolved_domain = domain.name
                    break # Stop after first success
                except socket.gaierror:
                    # Resolution failed
                    pass
                except Exception as e:
                     stats["errors"] += 1
            
            if resolved_domain:
                if ci.domain != resolved_domain:
                    ci.domain = resolved_domain
                    stats["updated"] += 1
    
        db.commit()

    except Exception as e:
        stats["errors"] += 1
        stats["details"].append(str(e))
    
    return stats
