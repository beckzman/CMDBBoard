import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costRuleAPI } from '../api/client';
import { Plus, Trash2, Edit } from 'lucide-react';
import './ConfigurationItems.css';

const CostRules: React.FC = () => {
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({
        ci_type: 'server',
        sla: '',
        operating_system: '',
        base_cost: 0,
        currency: 'EUR'
    });
    const [error, setError] = useState('');

    const queryClient = useQueryClient();

    const { data: rules, isLoading } = useQuery({
        queryKey: ['cost-rules'],
        queryFn: costRuleAPI.list,
    });

    const createMutation = useMutation({
        mutationFn: costRuleAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cost-rules'] });
            resetForm();
        },
        onError: (err: any) => setError(err.response?.data?.detail || 'Failed to create rule')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => costRuleAPI.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cost-rules'] });
            resetForm();
        },
        onError: (err: any) => setError(err.response?.data?.detail || 'Failed to update rule')
    });

    const deleteMutation = useMutation({
        mutationFn: costRuleAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cost-rules'] });
        },
        onError: () => alert('Failed to delete rule')
    });

    const resetForm = () => {
        setIsEditing(null);
        setEditForm({
            ci_type: 'server',
            sla: '',
            operating_system: '',
            base_cost: 0,
            currency: 'EUR'
        });
        setError('');
    };

    const handleEdit = (rule: any) => {
        setIsEditing(rule.id);
        setEditForm({ ...rule });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert base_cost to float
        const payload = {
            ...editForm,
            base_cost: parseFloat(editForm.base_cost),
            sla: editForm.sla || null,
            operating_system: editForm.operating_system || null
        };

        if (isEditing) {
            updateMutation.mutate({ id: isEditing, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <div className="ci-container">
            <div className="ci-header">
                <div>
                    <h1>Cost Control Rules</h1>
                    <p>Define base costs for Configuration Items based on attributes</p>
                </div>
            </div>

            <div className="ci-table-container" style={{ padding: '24px', maxWidth: '1000px' }}>
                <form onSubmit={handleSubmit} className="mb-8" style={{ marginBottom: '32px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        {isEditing ? 'Edit Cost Rule' : 'Add New Cost Rule'}
                    </h3>

                    {/* OS Matching Logic Info */}
                    <details style={{ marginBottom: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                        <summary style={{
                            padding: '12px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '14px' }}>ℹ️  Reference: Intelligent OS Matching Logic</span>
                        </summary>
                        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                The system automatically groups specific OS versions into generic categories for easier rule matching.
                            </p>
                            <table className="ci-table" style={{ fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '8px' }}>Generic Category</th>
                                        <th style={{ padding: '8px' }}>Matches Keywords / Examples</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>Linux</td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>ubuntu, debian, centos, redhat, fedora, suse, linux, rhel, aix</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>Windows Server</td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>windows server, windows 20 (e.g. 2012, 2019, 2022)</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>Windows Client</td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>windows 1 (e.g. 10, 11), windows 7, 8, xp, vista</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>macOS</td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>darwin, macos, osx</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </details>

                    {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label className="form-label">CI Type</label>
                            <select
                                className="form-input"
                                value={editForm.ci_type}
                                onChange={e => setEditForm({ ...editForm, ci_type: e.target.value })}
                                required
                            >
                                <option value="server">Server</option>
                                <option value="database">Database</option>
                                <option value="application">Application</option>
                                <option value="storage">Storage</option>
                                <option value="network_device">Network Device</option>
                                <option value="workstation">Workstation</option>
                                <option value="service">Service</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Service Level Agreement (SLA)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Gold, Silver (Optional)"
                                value={editForm.sla || ''}
                                onChange={e => setEditForm({ ...editForm, sla: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label">Operating System</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Windows Server 2022 (Optional)"
                                value={editForm.operating_system || ''}
                                onChange={e => setEditForm({ ...editForm, operating_system: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label">Base Cost (Monthly)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    placeholder="0.00"
                                    value={editForm.base_cost}
                                    onChange={e => setEditForm({ ...editForm, base_cost: e.target.value })}
                                    required
                                />
                                <select
                                    className="form-input"
                                    style={{ width: '80px' }}
                                    value={editForm.currency}
                                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                                >
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        {isEditing && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetForm}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            <span>{isEditing ? 'Update Rule' : 'Save Rule'}</span>
                        </button>
                    </div>
                </form>

                <div className="ci-table-wrapper">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>Active Rules</h3>
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <table className="ci-table">
                            <thead>
                                <tr>
                                    <th>CI Type</th>
                                    <th>SLA</th>
                                    <th>OS</th>
                                    <th>Cost</th>
                                    <th style={{ width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules && rules.length > 0 ? (
                                    rules.map((rule: any) => (
                                        <tr key={rule.id}>
                                            <td style={{ textTransform: 'capitalize' }}>{rule.ci_type.replace('_', ' ')}</td>
                                            <td>{rule.sla || <span style={{ opacity: 0.5 }}>Any</span>}</td>
                                            <td>{rule.operating_system || <span style={{ opacity: 0.5 }}>Any</span>}</td>
                                            <td style={{ fontWeight: 600, color: '#4ade80' }}>
                                                {rule.base_cost.toFixed(2)} {rule.currency}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="icon-btn edit"
                                                        title="Edit"
                                                        onClick={() => handleEdit(rule)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="icon-btn delete"
                                                        title="Delete"
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this rule?')) {
                                                                deleteMutation.mutate(rule.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className="empty-state">
                                                <p>No cost rules defined</p>
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

export default CostRules;
