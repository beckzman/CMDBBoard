import subprocess
import platform
import logging
import socket
from datetime import datetime
import json
from sqlalchemy.orm import Session
from app.db.models import ConfigurationItem, CIType

logger = logging.getLogger(__name__)

class HealthService:
    @staticmethod
    def _ping_host(target: str) -> bool:
        """
        Helper method to ping a target host.
        Returns True if reachable, False otherwise.
        """
        # Determine ping command based on OS
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '1', target]
        
        try:
            # Run ping command with a timeout of 2 seconds
            output = subprocess.run(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                timeout=2,
                text=True
            )
            return output.returncode == 0
        except Exception as e:
            logger.warning(f"Ping error for {target}: {str(e)}")
            return False

    @staticmethod
    def _resolve_ip(hostname: str) -> str:
        """
        Helper method to resolve IP address.
        Returns IP string or None if resolution fails.
        """
        try:
            return socket.gethostbyname(hostname)
        except Exception:
            return None

    @staticmethod
    def _check_tcp_port(target: str, port: int) -> bool:
        """
        Helper method to check if a TCP port is open.
        """
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        try:
            result = sock.connect_ex((target, port))
            return result == 0
        except Exception as e:
            logger.warning(f"TCP connect error for {target}:{port}: {e}")
            return False
        finally:
            sock.close()

    @staticmethod
    def check_ci_health(db: Session, ci: ConfigurationItem) -> dict:
        """
        Check the health of a Configuration Item.
        Strategy:
        1. Try pinging the 'name' field directly.
        2. If that fails and 'domain' is present, try pinging 'name.domain'.
        
        Updates the last_ping_success timestamp on successful ping.
        """
        hostname = ci.name
        if not hostname:
            return {"status": "unknown", "details": "No hostname provided"}
            
        # Try to resolve IP
        ip_address = HealthService._resolve_ip(hostname)

        # Special handling for DATABASE type
        if ci.ci_type == CIType.DATABASE:
            target_ports = []
            
            # 1. Try to find port in technical definitions
            if ci.technical_details:
                try:
                    details_json = json.loads(ci.technical_details)
                    if 'port' in details_json:
                        target_ports.append(int(details_json['port']))
                except:
                    pass
            
            # 2. Add default ports if no specific port found
            if not target_ports:
                target_ports = [1521, 5432, 3306, 1433] # Oracle, Postgres, MySQL, MSSQL
            
            # Check ports
            for port in target_ports:
                if HealthService._check_tcp_port(hostname, port):
                    is_reachable = True
                    details = f"Database reachable on port {port}"
                    break
            else:
                # If hostname failed, try IP
                if ip_address:
                    for port in target_ports:
                         if HealthService._check_tcp_port(ip_address, port):
                            is_reachable = True
                            details = f"Database reachable on IP {ip_address} port {port}"
                            break
                    else:
                        is_reachable = False
                        details = f"Database unreachable on ports {target_ports}"
                else:
                    is_reachable = False
                    details = f"Database unreachable on ports {target_ports}"
        else:
            # Standard ICMP Ping for non-database CIs
            
            # 1. Try pinging hostname directly
            is_reachable = HealthService._ping_host(hostname)
            details = "Host is reachable via hostname"
            
            # 2. If failed and domain exists, try FQDN
            if not is_reachable and ci.domain:
                fqdn = f"{hostname}.{ci.domain}"
                # Try resolving FQDN if simple hostname failed
                if not ip_address:
                    ip_address = HealthService._resolve_ip(fqdn)
                    
                is_reachable = HealthService._ping_host(fqdn)
                if is_reachable:
                    details = f"Host is reachable via FQDN ({fqdn})"
                else:
                    details = "Host is unreachable (tried hostname and FQDN)"
            elif not is_reachable:
                 details = "Host is unreachable"

        result = {
            "status": "unreachable",
            "details": details,
            "ip_address": ip_address
        }

        if is_reachable:
            # Update last successful ping timestamp
            ci.last_ping_success = datetime.utcnow()
            db.commit()
            db.refresh(ci)
            
            result["status"] = "alive"
            result["last_ping_success"] = ci.last_ping_success
            
        return result
