import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Optional

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings
from app.db.models import ConfigurationItem, CostRule, CIType


def normalize_os(os_name: str) -> str:
    """Normalize OS name to generic categories."""
    if not os_name:
        return ""
    
    os_name = os_name.lower()
    
    # Linux
    if any(x in os_name for x in ['ubuntu', 'debian', 'centos', 'redhat', 'fedora', 'suse', 'linux', 'rhel', 'aix']):
        return "linux"
    
    # Windows Server
    if any(x in os_name for x in ['windows server', 'windows 20']):
        return "windows server"
        
    # Windows Client
    if any(x in os_name for x in ['windows 1', 'windows 7', 'windows 8', 'windows xp', 'windows vista']):
        return "windows client"
        
    return os_name

def check_cost_mappings():
    engine = create_engine(str(settings.DATABASE_URL))
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Get all Server CIs that are not deleted
        server_cis = session.query(ConfigurationItem).filter(
            ConfigurationItem.ci_type == CIType.SERVER,
            ConfigurationItem.deleted_at.is_(None)
        ).all()
        
        print(f"Total Server CIs: {len(server_cis)}")

        # Get all Cost Rules
        cost_rules = session.query(CostRule).filter(
            CostRule.ci_type == CIType.SERVER
        ).all()
        
        print(f"Total Server Cost Rules: {len(cost_rules)}")
        for rule in cost_rules:
            print(f"  - Rule: SLA='{rule.sla}', OS='{rule.os_db_system}', Cost={rule.base_cost}")
        
        unmapped_cis = []
        mapped_generic = []
        mapped_specific = []
        
        for ci in server_cis:
            matched_rule = None
            
            # Pre-calculate normalized OS for CI
            normalized_ci_os = normalize_os(ci.os_db_system)

            for rule in cost_rules:
                # Check SLA match (contains)
                if rule.sla and ci.sla:
                    if rule.sla.lower() not in ci.sla.lower() and ci.sla.lower() not in rule.sla.lower():
                        continue
                elif rule.sla and not ci.sla:
                    # Rule requires SLA, CI has none -> Mismatch
                    continue
                
                # Check OS match (contains OR normalized)
                if rule.os_db_system:
                    rule_os = rule.os_db_system.strip().lower()
                    ci_os = (ci.os_db_system or "").lower()
                    
                    # Direct/Substring Match
                    is_direct_match = rule_os == ci_os or (ci_os and rule_os in ci_os)
                    
                    # Normalized Match (e.g. Rule "Linux" matches CI "AIX" -> "linux")
                    is_normalized_match = rule_os == normalized_ci_os
                    
                    if not is_direct_match and not is_normalized_match:
                         continue
                
                matched_rule = rule
                break
            
            if not matched_rule:
                unmapped_cis.append(ci)
            else:
                # Is it generic? (No specific SLA/OS requirements)
                if not matched_rule.sla and not matched_rule.os_db_system:
                    mapped_generic.append(ci)
                else:
                    mapped_specific.append(ci)

        print("-" * 30)
        print(f"Mapped to Generic Rule: {len(mapped_generic)}")
        print(f"Mapped to Specific Rule: {len(mapped_specific)}")
        print(f"Not Mapped (No Rule): {len(unmapped_cis)}")
        print("-" * 30)
        
        if len(unmapped_cis) > 0:
            output_file = "unmapped_servers.txt"
            with open(output_file, "w") as f:
                f.write(f"Unmapped Server CIs ({len(unmapped_cis)} total)\n")
                f.write("=" * 50 + "\n")
                f.write(f"{'Name':<30} | {'SLA':<15} | {'OS/DB System'}\n")
                f.write("-" * 50 + "\n")
                for ci in unmapped_cis:
                    f.write(f"{ci.name:<30} | {str(ci.sla):<15} | {str(ci.os_db_system)}\n")
            
            print(f"\nFull list of {len(unmapped_cis)} unmapped servers written to: {output_file}")
            
            print("Sample Unmapped CIs:")
            for ci in unmapped_cis[:5]:
                print(f"  - {ci.name} (SLA: {ci.sla}, OS: {ci.os_db_system})")

    finally:
        session.close()

if __name__ == "__main__":
    check_cost_mappings()
