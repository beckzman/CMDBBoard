import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainAPI } from '../api/client';
import { Plus, Trash2, Globe } from 'lucide-react';
import './ConfigurationItems.css'; // Reusing existing styles for consistency

const DomainManagement: React.FC = () => {
    const [newDomain, setNewDomain] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const queryClient = useQueryClient();

    const { data: domains, isLoading } = useQuery({
        queryKey: ['domains'],
        queryFn: () => domainAPI.list(true),
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; description: string }) =>
            domainAPI.create(data.name, data.description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['domains'] });
            setNewDomain('');
            setDescription('');
            setError('');
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to create domain');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: domainAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['domains'] });
        },
        onError: () => {
            alert('Failed to delete domain');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain.trim()) return;
        createMutation.mutate({ name: newDomain, description });
    };

    return (
        <div className="ci-container">
            <div className="ci-header">
                <div>
                    <h1>Domain Management</h1>
                    <p>Configure available domains for Configuration Items</p>
                </div>
            </div>

            <div className="ci-table-container" style={{ padding: '24px', maxWidth: '800px' }}>
                <form onSubmit={handleSubmit} className="mb-8" style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>Add New Domain</h3>
                    {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Domain Name (e.g. example.com)"
                                className="form-input"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Description (Optional)"
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isPending}
                        >
                            <Plus size={18} />
                            <span>Add</span>
                        </button>
                    </div>
                </form>

                <div className="ci-table-wrapper">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>Active Domains</h3>
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <table className="ci-table">
                            <thead>
                                <tr>
                                    <th>Domain Name</th>
                                    <th>Description</th>
                                    <th style={{ width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {domains && domains.length > 0 ? (
                                    domains.map((domain: any) => (
                                        <tr key={domain.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Globe size={16} className="text-secondary" />
                                                    <span className="ci-name">{domain.name}</span>
                                                </div>
                                            </td>
                                            <td>{domain.description || '-'}</td>
                                            <td>
                                                <button
                                                    className="icon-btn delete"
                                                    title="Delete"
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to delete domain "${domain.name}"?`)) {
                                                            deleteMutation.mutate(domain.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="empty-state">
                                                <p>No domains configured</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DomainManagement;
