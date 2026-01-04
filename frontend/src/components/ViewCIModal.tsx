import React from 'react';
import { X } from 'lucide-react';
import './AddCIModal.css'; // Reusing the same styles for consistency

interface ViewCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    ci: any;
}

const ViewCIModal: React.FC<ViewCIModalProps> = ({ isOpen, onClose, ci }) => {

    if (!isOpen || !ci) return null;

    const getStatusColor = (status: string) => {
        const statusMap: Record<string, string> = {
            active: 'success',
            inactive: 'warning',
            retired: 'error',
            planned: 'info',
            maintenance: 'warning',
        };
        return statusMap[status.toLowerCase()] || 'info';
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2>Configuration Item Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="view-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div className="view-row">
                                <label>Name:</label>
                                <span>{ci.name}</span>
                            </div>
                            <div className="view-row">
                                <label>Type:</label>
                                <span className="ci-type-badge">{ci.ci_type.replace('_', ' ')}</span>
                            </div>
                            <div className="view-row">
                                <label>Status:</label>
                                <span className={`badge badge-${getStatusColor(ci.status)}`}>{ci.status}</span>
                            </div>
                            <div className="view-row">
                                <label>SLA:</label>
                                <span>{ci.sla || '-'}</span>
                            </div>
                            <div className="view-row">
                                <label>Abteilung:</label>
                                <span>{ci.department || '-'}</span>
                            </div>
                        </div>
                        <div>
                            <div className="view-row">
                                <label>Location:</label>
                                <span>{ci.location || '-'}</span>
                            </div>
                            <div className="view-row">
                                <label>Cost Center:</label>
                                <span>{ci.cost_center || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>OS/DB System</label>
                                <span>{ci.os_db_system || '-'}</span>
                            </div>
                            <div className="view-row">
                                <label>Environment:</label>
                                <span>{ci.environment || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="view-row" style={{ marginTop: '15px' }}>
                        <label>Description:</label>
                        <p className="view-description">{ci.description || '-'}</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewCIModal;
