import sys
import os
import socket
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)

from app.db.database import SessionLocal
from app.db.models import ConfigurationItem, Domain

def resolve_dns_for_cis():
    db: Session = SessionLocal()
    try:
        # Get active domains (suffixes)
        domains = db.query(Domain).filter(Domain.is_active == True).all()
        if not domains:
            print("No active domains found to test against.")
            return

        print(f"Loaded {len(domains)} active domains: {[d.name for d in domains]}")

        # Get all CIs
        cis = db.query(ConfigurationItem).all()
        
        print(f"Processing {len(cis)} CIs...")

        for ci in cis:
            print(f"Checking CI: {ci.name} (Current Domain: {ci.domain})")
            
            resolved_domain = None
            
            # Try each domain suffix
            for domain in domains:
                fqdn = f"{ci.name}.{domain.name}"
                try:
                    # Try to resolve
                    ip_address = socket.gethostbyname(fqdn)
                    print(f"  [SUCCESS] Resolved {fqdn} -> {ip_address}")
                    resolved_domain = domain.name
                    break # Stop after first success
                except socket.gaierror:
                    # Resolution failed
                    # print(f"  [FAILED]  Could not resolve {fqdn}")
                    pass
            
            if resolved_domain:
                if ci.domain != resolved_domain:
                    print(f"  -> Updating CI {ci.name} domain to {resolved_domain}")
                    ci.domain = resolved_domain
                    db.commit()
                else:
                    print(f"  -> CI {ci.name} already has correct domain set.")
            else:
                print(f"  -> Could not resolve CI {ci.name} with any known domain.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting DNS resolution check...")
    resolve_dns_for_cis()
    print("Done.")
