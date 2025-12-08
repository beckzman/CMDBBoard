import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ciAPI } from '../api/client';
import { X } from 'lucide-react';
import './AddCIModal.css';

interface AddCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

const AddCIModal: React.FC<AddCIModalProps> = ({ isOpen, onClose, initialData }) => {
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        ci_type: 'server',
        status: 'active',
        domain: '',
        description: '',
        owner: '',
        location: '',
        environment: 'production',
        cost_center: '',
        operating_system: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                ci_type: initialData.ci_type || 'server',
                status: initialData.status || 'active',
                domain: initialData.domain || '',
                description: initialData.description || '',
                owner: initialData.owner || '',
                location: initialData.location || '',
                environment: initialData.environment || 'production',
                cost_center: initialData.cost_center || '',
                operating_system: initialData.operating_system || '',
            });
        } else {
            setFormData({
                name: '',
                ci_type: 'server',
                status: 'active',
                domain: '',
                description: '',
                owner: '',
                location: '',
                environment: 'production',
                cost_center: '',
                operating_system: '',
            });
        }
    }, [initialData, isOpen]);

    const createMutation = useMutation({
        mutationFn: ciAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cis'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to create configuration item');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => ciAPI.update(initialData.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cis'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to update configuration item');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (initialData) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>{initialData ? 'Edit Configuration Item' : 'Add New Configuration Item'}</h2>
                    <button onClick={onClose} className="close-btn">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-content">
                    {error && <div className="error-alert">{error}</div>}

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="name">Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="form-input"
                                required
                                placeholder="e.g. SRV-PROD-001"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ci_type">Type *</label>
                            <select
                                id="ci_type"
                                name="ci_type"
                                value={formData.ci_type}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="server">Server</option>
                                <option value="application">Application</option>
                                <option value="network_device">Network Device</option>
                                <option value="database">Database</option>
                                <option value="workstation">Workstation</option>
                                <option value="storage">Storage</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="domain">Domain</label>
                            <select
                                id="domain"
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">Select Domain...</option>
                                <option value="arcelormittal.com">arcelormittal.com</option>
                                <option value="local">local</option>
                                <option value="internal">internal</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Status *</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="retired">Retired</option>
                                <option value="planned">Planned</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="environment">Environment</label>
                            <select
                                id="environment"
                                name="environment"
                                value={formData.environment}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="production">Production</option>
                                <option value="staging">Staging</option>
                                <option value="development">Development</option>
                                <option value="testing">Testing</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="owner">Owner</label>
                            <input
                                type="text"
                                id="owner"
                                name="owner"
                                value={formData.owner}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Location</label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Data Center A"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="cost_center">Cost Center</label>
                            <input
                                type="text"
                                id="cost_center"
                                name="cost_center"
                                value={formData.cost_center}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. IT-OPS-001"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="operating_system">Operating System</label>
                            <input
                                type="text"
                                id="operating_system"
                                name="operating_system"
                                value={formData.operating_system}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Windows Server 2022"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Enter description..."
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isPending}
                        >
                            {isPending ? 'Saving...' : (initialData ? 'Update Item' : 'Create Item')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCIModal;
