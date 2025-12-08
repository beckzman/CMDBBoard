import React from 'react';
import { X, CheckCircle, XCircle, Loader2, Network } from 'lucide-react';
import './AddCIModal.css'; // Reusing existing modal styles

interface HealthCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    ciName: string;
    result: {
        status: 'alive' | 'unreachable' | null;
        details: string;
        ip_address?: string | null;
    } | null;
}

const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ isOpen, onClose, isLoading, ciName, result }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h2>Health Check Status</h2>
                    <button onClick={onClose} className="close-btn" disabled={isLoading}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '32px 0'
                    }}>
                        {isLoading ? (
                            <>
                                <div style={{
                                    marginBottom: '24px',
                                    color: '#F47D30'
                                }}>
                                    <Loader2 size={48} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>
                                    Pinging {ciName}...
                                </h3>
                                <p style={{ color: '#B0B2B8', fontSize: '14px' }}>
                                    Please wait while we check connectivity.
                                </p>
                            </>
                        ) : result ? (
                            <>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: result.status === 'alive' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '24px',
                                    color: result.status === 'alive' ? '#22c55e' : '#ef4444'
                                }}>
                                    {result.status === 'alive' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>
                                    {ciName} is {result.status === 'alive' ? 'ONLINE' : 'UNREACHABLE'}
                                </h3>

                                {result.ip_address && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        marginBottom: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <Network size={14} color="#B0B2B8" />
                                        <span style={{ color: '#E0E0E0', fontSize: '13px', fontFamily: 'monospace' }}>
                                            {result.ip_address}
                                        </span>
                                    </div>
                                )}

                                <div style={{
                                    backgroundColor: '#25262C',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    marginTop: '8px',
                                    maxWidth: '100%'
                                }}>
                                    <code style={{ color: '#B0B2B8', fontSize: '13px', fontFamily: 'monospace' }}>
                                        {result.details}
                                    </code>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        disabled={isLoading}
                    >
                        Close
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default HealthCheckModal;
