import React, { useState } from 'react';
import { X, FileJson, Layout, Info } from 'lucide-react';
import './AddCIModal.css';

interface ViewCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    ci: any;
    initialTab?: 'general' | 'technical' | 'raw';
}

const ViewCIModal: React.FC<ViewCIModalProps> = ({ isOpen, onClose, ci, initialTab = 'general' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Reset tab when modal opens/changes
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

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
            <div className="modal-container" style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2>Configuration Item Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs Header */}
                <div className="modal-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px' }}>
                    <button
                        className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                        style={{
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'general' ? 'var(--primary)' : '#9ca3af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Info size={16} />
                        General
                    </button>
                    {(ci.technical_details || ci.raw_data) && (
                        <button
                            className={`tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
                            onClick={() => setActiveTab('technical')}
                            style={{
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'technical' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'technical' ? 'var(--primary)' : '#9ca3af',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Layout size={16} />
                            Technical Details
                        </button>
                    )}
                    {ci.raw_data && (
                        <button
                            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                            onClick={() => setActiveTab('raw')}
                            style={{
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'raw' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'raw' ? 'var(--primary)' : '#9ca3af',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FileJson size={16} />
                            Raw Data (Source)
                        </button>
                    )}
                </div>

                <div className="modal-content" style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

                    {activeTab === 'general' && (
                        <div className="view-grid-container">
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
                    )}

                    {activeTab === 'technical' && (
                        <div className="json-viewer-container">
                            {ci.technical_details ? (
                                <pre className="view-description" style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    padding: '15px',
                                    borderRadius: '6px',
                                    fontSize: '0.9em',
                                    fontFamily: 'monospace',
                                    color: '#d1d5db'
                                }}>
                                    {(() => {
                                        try {
                                            return JSON.stringify(JSON.parse(ci.technical_details), null, 2);
                                        } catch (e) {
                                            return ci.technical_details;
                                        }
                                    })()}
                                </pre>
                            ) : (
                                <p className="text-muted">No technical details available.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'raw' && (
                        <div className="json-viewer-container">
                            <p style={{ marginBottom: '10px', fontSize: '13px', color: '#6b7280' }}>
                                Full import record from source system.
                            </p>
                            {ci.raw_data ? (
                                <pre className="view-description" style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    backgroundColor: '#0f172a',
                                    padding: '15px',
                                    borderRadius: '6px',
                                    fontSize: '0.85em',
                                    fontFamily: 'monospace',
                                    color: '#818cf8',
                                    border: '1px solid #1e293b'
                                }}>
                                    {(() => {
                                        if (typeof ci.raw_data === 'object') {
                                            return JSON.stringify(ci.raw_data, null, 2);
                                        }
                                        try {
                                            return JSON.stringify(JSON.parse(ci.raw_data), null, 2);
                                        } catch (e) {
                                            return ci.raw_data;
                                        }
                                    })()}
                                </pre>
                            ) : (
                                <p className="text-muted">No raw import data available.</p>
                            )}
                        </div>
                    )}

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
