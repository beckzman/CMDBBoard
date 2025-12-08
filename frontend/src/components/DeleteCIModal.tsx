import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './AddCIModal.css'; // Reusing existing modal styles

interface DeleteCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    ciName: string;
    isPending: boolean;
}

const DeleteCIModal: React.FC<DeleteCIModalProps> = ({ isOpen, onClose, onConfirm, ciName, isPending }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Delete Item</h2>
                    <button onClick={onClose} className="close-btn" disabled={isPending}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            color: '#ef4444'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#FFFFFF' }}>
                            Are you sure?
                        </h3>
                        <p style={{ color: '#B0B2B8', fontSize: '14px', lineHeight: '1.5' }}>
                            This action cannot be undone. You are about to delete <strong style={{ color: '#FFFFFF' }}>{ciName}</strong>.
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn btn-primary"
                        style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                        disabled={isPending}
                    >
                        {isPending ? 'Deleting...' : 'Delete Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCIModal;
