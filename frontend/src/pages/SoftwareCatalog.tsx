import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { softwareAPI } from '../api/client';
import { Search, Plus, X, Server, Database, Link, Edit } from 'lucide-react';
import StandardizationQueue from '../components/StandardizationQueue';

import './ConfigurationItems.css';
import './SoftwareCatalog.css';

// Types
export interface SoftwareItem {
    id: number;
    name: string;
    version?: string;
    publisher?: string;
    category: 'os' | 'database' | 'application' | 'other';
    status: 'approved' | 'unapproved' | 'restricted' | 'end_of_life';
    end_of_life_date?: string;
    aliases: string[];
    ci_count: number;
}

export interface UnmatchedItem {
    value: string;
    count: number;
}

const SoftwareCatalog: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'catalog' | 'standardization'>('catalog');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SoftwareItem | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        version: '',
        publisher: '',
        category: 'os' as 'os' | 'database' | 'application' | 'other',
        status: 'approved' as 'approved' | 'unapproved' | 'restricted' | 'end_of_life',
        end_of_life_date: '',
        aliases: [] as string[]
    });

    const [newAlias, setNewAlias] = useState('');

    // Queries
    const { data: catalogItems, isLoading: loadingCatalog, error: catalogError } = useQuery({
        queryKey: ['softwareCatalog', searchTerm],
        queryFn: () => softwareAPI.list({ search: searchTerm })
    });

    const { data: unmatchedItems, isLoading: loadingUnmatched } = useQuery({
        queryKey: ['unmatchedSoftware'],
        queryFn: softwareAPI.getUnmatched
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: softwareAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['softwareCatalog'] });
            closeModal();
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'object' ? JSON.stringify(detail, null, 2) : (detail || error.message);
            alert('Failed to create software: ' + message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => softwareAPI.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['softwareCatalog'] });
            closeModal();
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'object' ? JSON.stringify(detail, null, 2) : (detail || error.message);
            alert('Failed to update software: ' + message);
        }
    });

    // Handlers
    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingItem(null);
        setFormData({
            name: '',
            version: '',
            publisher: '',
            category: 'os',
            status: 'approved',
            end_of_life_date: '',
            aliases: []
        });
    };

    const handleCreate = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            version: '',
            publisher: '',
            category: 'os',
            status: 'approved',
            end_of_life_date: '',
            aliases: []
        });
        setIsCreateModalOpen(true);
    };

    const handleEdit = (item: SoftwareItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            version: item.version || '',
            publisher: item.publisher || '',
            category: item.category,
            status: item.status,
            end_of_life_date: item.end_of_life_date ? item.end_of_life_date.split('T')[0] : '', // Format for date input
            aliases: item.aliases || []
        });
        setIsCreateModalOpen(true);
    };

    const handleSave = () => {
        // Sanitize data: convert empty strings to null/undefined where strictly required
        // Pydantic expects a valid datetime string if provided
        let eolDate = null;
        if (formData.end_of_life_date) {
            eolDate = `${formData.end_of_life_date}T00:00:00`;
        }

        const payload = {
            ...formData,
            end_of_life_date: eolDate
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleCreateFromUnmatched = (unmatchedString: string) => {
        setFormData({
            name: unmatchedString,
            version: '',
            publisher: '',
            category: 'os',
            status: 'approved',
            end_of_life_date: '',
            aliases: [unmatchedString]
        });
        setIsCreateModalOpen(true);
    };

    const handleAddAlias = () => {
        if (newAlias && !formData.aliases.includes(newAlias)) {
            setFormData({
                ...formData,
                aliases: [...formData.aliases, newAlias]
            });
            setNewAlias('');
        }
    };

    const handleRemoveAlias = (aliasToRemove: string) => {
        setFormData({
            ...formData,
            aliases: formData.aliases.filter(alias => alias !== aliasToRemove)
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'approved';
            case 'unapproved': return 'unapproved';
            case 'restricted': return 'restricted';
            case 'end_of_life': return 'end-of-life';
            default: return 'unapproved';
        }
    };

    return (
        <div className="ci-container">
            {/* Header */}
            <div className="ci-header">
                <div>
                    <h1>Software Catalog (DML)</h1>
                    <p>Manage approved software versions and standardized naming.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn btn-primary"
                >
                    <Plus size={18} />
                    <span>Add Software Model</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="sc-tabs-container">
                <div className="sc-tabs-wrapper">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`sc-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
                    >
                        Catalog Items
                    </button>
                    <button
                        onClick={() => setActiveTab('standardization')}
                        className={`sc-tab-btn ${activeTab === 'standardization' ? 'active' : ''}`}
                    >
                        Standardization Queue
                        {unmatchedItems?.length > 0 && (
                            <span className="sc-badge">
                                {unmatchedItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content: Catalog */}
            {activeTab === 'catalog' && (
                <div className="ci-table-container">
                    <div style={{ padding: '0 24px 16px 24px' }}>
                        <div className="search-box" style={{ maxWidth: '400px' }}>
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Search software..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    <div className="ci-table-wrapper">
                        <table className="ci-table">
                            <thead>
                                <tr>
                                    <th>Software Name</th>
                                    <th>Publisher</th>
                                    <th>Category</th>
                                    <th className="status-col">Status</th>
                                    <th>End of Life</th>
                                    <th>Matched CIs</th>
                                    <th>Aliases</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingCatalog ? (
                                    <tr><td colSpan={8} className="loading-cell">Loading...</td></tr>
                                ) : catalogError ? (
                                    <tr><td colSpan={8} className="error-cell">Error: {(catalogError as any).message}</td></tr>
                                ) : !catalogItems || catalogItems.length === 0 ? (
                                    <tr><td colSpan={8} className="empty-cell">No software items found.</td></tr>
                                ) : catalogItems.map((item: SoftwareItem) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {item.category === 'database' ? <Database size={16} className="text-blue" /> : <Server size={16} className="text-purple" />}
                                                <div>
                                                    <div className="ci-name">{item.name}</div>
                                                    <small style={{ color: 'var(--text-secondary)' }}>{item.version}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{item.publisher || '-'}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                                        <td className="status-col">
                                            <span className={`status-badge ${getStatusColor(item.status)}`}>
                                                {item.status === 'end_of_life' ? 'EoL' : item.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>
                                            {item.end_of_life_date ? new Date(item.end_of_life_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            <span className="count-badge">
                                                {item.ci_count}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {item.aliases.slice(0, 3).map((alias, i) => (
                                                    <span key={i} className="sc-tag">
                                                        {alias}
                                                    </span>
                                                ))}
                                                {item.aliases.length > 3 && (
                                                    <span className="tag-more">+{item.aliases.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="icon-btn edit"
                                                onClick={() => handleEdit(item)}
                                                title="Edit Software"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content: Standardization */}
            {activeTab === 'standardization' && (
                <StandardizationQueue
                    unmatchedItems={unmatchedItems}
                    catalogItems={catalogItems}
                    isLoading={loadingUnmatched}
                    onCreateNew={handleCreateFromUnmatched}
                />
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="sc-modal-overlay">
                    <div className="sc-modal-content">
                        <div className="sc-modal-header">
                            <h2>{editingItem ? 'Edit Software Model' : 'Add Software Model'}</h2>
                            <button onClick={closeModal} className="sc-modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="sc-modal-body">
                            <div className="sc-form-group">
                                <label className="sc-label">Software Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="sc-input"
                                />
                            </div>
                            <div className="sc-grid-2">
                                <div className="sc-form-group">
                                    <label className="sc-label">Publisher</label>
                                    <input
                                        type="text"
                                        value={formData.publisher}
                                        onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                        className="sc-input"
                                    />
                                </div>
                                <div className="sc-form-group">
                                    <label className="sc-label">Version</label>
                                    <input
                                        type="text"
                                        value={formData.version}
                                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                        className="sc-input"
                                    />
                                </div>
                            </div>
                            <div className="sc-grid-2">
                                <div className="sc-form-group">
                                    <label className="sc-label">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="sc-select"
                                    >
                                        <option value="os">OS</option>
                                        <option value="database">Database</option>
                                        <option value="application">Application</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="sc-form-group">
                                    <label className="sc-label">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="sc-select"
                                    >
                                        <option value="approved">Approved</option>
                                        <option value="unapproved">Unapproved</option>
                                        <option value="restricted">Restricted</option>
                                        <option value="end_of_life">EoL</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sc-form-group">
                                <label className="sc-label">End of Life</label>
                                <input
                                    type="date"
                                    value={formData.end_of_life_date}
                                    onChange={(e) => setFormData({ ...formData, end_of_life_date: e.target.value })}
                                    className="sc-input"
                                />
                            </div>

                            <div className="sc-form-group">
                                <label className="sc-label">Auto-Match Aliases</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        value={newAlias}
                                        onChange={(e) => setNewAlias(e.target.value)}
                                        placeholder="Add new alias..."
                                        className="sc-input"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddAlias();
                                            }
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={handleAddAlias}
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '8px' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {formData.aliases.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {formData.aliases.map((alias, i) => (
                                            <span key={i} className="sc-tag">
                                                <Link size={10} />
                                                {alias}
                                                <button
                                                    onClick={() => handleRemoveAlias(alias)}
                                                    className="hover:text-red-400 ml-1"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>No aliases defined.</p>
                                )}
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>These strings will be automatically linked to this software.</p>
                            </div>
                        </div>
                        <div className="sc-modal-footer">
                            <button
                                onClick={closeModal}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingItem ? 'Save Changes' : 'Create Software')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoftwareCatalog;
