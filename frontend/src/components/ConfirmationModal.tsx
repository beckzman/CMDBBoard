import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import './AddCIModal.css'; // Reuse existing modal styles

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'red' | 'blue' | 'green';
    isPending?: boolean;
    icon?: 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmColor = "blue",
    isPending = false,
    icon = 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (icon) {
            case 'warning': return <AlertTriangle size={24} />;
            case 'success': return <CheckCircle size={24} />;
            default: return <Info size={24} />;
        }
    };

    const getIconColor = () => {
        switch (icon) {
            case 'warning': return '#ef4444';
            case 'success': return '#22c55e';
            default: return '#3b82f6';
        }
    };

    const getButtonColor = () => {
        switch (confirmColor) {
            case 'red': return '#ef4444';
            case 'green': return '#22c55e';
            default: return '#3b82f6';
        }
    };

    // Calculate background color with opacity manually for simplicity
    const getIconBgColor = () => {
        switch (icon) {
            case 'warning': return 'rgba(239, 68, 68, 0.1)';
            case 'success': return 'rgba(34, 197, 94, 0.1)';
            default: return 'rgba(59, 130, 246, 0.1)';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>{title}</h2>
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
                            backgroundColor: getIconBgColor(),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            color: getIconColor()
                        }}>
                            {getIcon()}
                        </div>
                        <div style={{ color: '#B0B2B8', fontSize: '14px', lineHeight: '1.5' }}>
                            {message}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isPending}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn btn-primary"
                        style={{ backgroundColor: getButtonColor(), borderColor: getButtonColor() }}
                        disabled={isPending}
                    >
                        {isPending ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
