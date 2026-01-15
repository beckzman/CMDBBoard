import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ciAPI, domainAPI, relationshipAPI, softwareAPI } from '../api/client';
import { X, Plus, Trash2, Link as LinkIcon, ArrowRight } from 'lucide-react';
import DeleteCIModal from './DeleteCIModal';
import './AddCIModal.css';

interface AddCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

const AddCIModal: React.FC<AddCIModalProps> = ({ isOpen, onClose, initialData }) => {
    const queryClient = useQueryClient();
    const [error, setError] = useState('');

    // Relationship State
    const [relationships, setRelationships] = useState<any[]>([]);
    const [loadingRels, setLoadingRels] = useState(false);
    const [showAddRelation, setShowAddRelation] = useState(false);
    const [relationType, setRelationType] = useState('runs_on');
    const [targetSearch, setTargetSearch] = useState('');
    const [targetProjectCandidates, setTargetProjectCandidates] = useState<any[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<any>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [relationToDelete, setRelationToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const { data: domains } = useQuery({
        queryKey: ['domains'],
        queryFn: () => domainAPI.list(true),
        enabled: isOpen,
    });

    const { data: softwareList } = useQuery({
        queryKey: ['softwareCatalogAll'],
        queryFn: () => softwareAPI.list(),
        enabled: isOpen,
    });

    const [formData, setFormData] = useState({
        name: '',
        ci_type: 'server',
        status: 'active',
        domain: '',
        description: '',
        department: '',
        location: '',
        environment: 'production',
        cost_center: '',
        sla: '',
        service_provider: '',
        contact: '',
        os_db_system: '',
        software_id: '' as string | number, // Allow empty string for "none"
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                ci_type: initialData.ci_type || 'server',
                status: initialData.status || 'active',
                domain: initialData.domain || '',
                description: initialData.description || '',
                department: initialData.department || '',
                location: initialData.location || '',
                environment: initialData.environment || 'production',
                cost_center: initialData.cost_center || '',
                sla: initialData.sla || '',
                service_provider: initialData.service_provider || '',
                contact: initialData.contact || '',
                os_db_system: initialData.os_db_system || initialData.operating_system || '',
                software_id: initialData.software_id || '',
            });
            fetchRelationships();
        } else {
            setFormData({
                name: '',
                ci_type: 'server',
                status: 'active',
                domain: '',
                description: '',
                department: '',
                location: '',
                environment: 'production',
                cost_center: '',
                sla: '',
                service_provider: '',
                contact: '',
                os_db_system: '',
                software_id: '',
            });
            setRelationships([]);
        }

        // Reset local state
        setShowAddRelation(false);
        setTargetSearch('');
        setSelectedTarget(null);
        setTargetProjectCandidates([]);
    }, [initialData, isOpen]);

    // Relationship Search Effect
    useEffect(() => {
        const searchCIs = async () => {
            if (targetSearch.length < 2) {
                setTargetProjectCandidates([]);
                return;
            }


            try {
                const response = await ciAPI.list({
                    search: targetSearch,
                    page: 1,
                    page_size: 10
                });
                // Filter out current CI if editing
                const candidates = response.items.filter((item: any) => !initialData || item.id !== initialData.id);
                setTargetProjectCandidates(candidates);
            } catch (error) {
                console.error("Failed to search CIs", error);
            } finally {
            }
        };

        const timeoutId = setTimeout(searchCIs, 500);
        return () => clearTimeout(timeoutId);
    }, [targetSearch, initialData]);

    const fetchRelationships = async () => {
        if (!initialData) return;
        setLoadingRels(true);
        try {
            const data = await relationshipAPI.getByCI(initialData.id);
            const enrichedrels = await Promise.all(data.map(async (rel: any) => {
                const isSource = rel.source_ci_id === initialData.id;
                const otherId = isSource ? rel.target_ci_id : rel.source_ci_id;
                try {
                    const otherCI = await ciAPI.get(otherId);
                    return { ...rel, otherCI, isSource };
                } catch (e) {
                    return { ...rel, otherCI: { name: 'Unknown' }, isSource };
                }
            }));
            setRelationships(enrichedrels);
        } catch (error) {
            console.error("Failed to fetch relationships", error);
        } finally {
            setLoadingRels(false);
        }
    };

    const handleAddRelationship = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        if (!selectedTarget || !initialData) return;
        try {
            await relationshipAPI.create({
                source_ci_id: initialData.id,
                target_ci_id: selectedTarget.id,
                relationship_type: relationType
            });
            await fetchRelationships();
            setShowAddRelation(false);
            setTargetSearch('');
            setSelectedTarget(null);
        } catch (error) {
            console.error("Failed to create relationship", error);
            alert("Failed to create relationship");
        }
    };

    const confirmDeleteRelationship = (id: number) => {
        setRelationToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteRelationship = async () => {
        if (!relationToDelete) return;

        console.log(`[AddCIModal] Deleting relationship ID: ${relationToDelete}`);
        setIsDeleting(true);
        try {
            await relationshipAPI.delete(relationToDelete);
            console.log(`[AddCIModal] Relationship deleted successfully`);
            fetchRelationships();
            setDeleteModalOpen(false);
            setRelationToDelete(null);
        } catch (error) {
            console.error("[AddCIModal] Failed to delete relationship", error);
            alert("Failed to delete relationship: " + (error as any).message); // Using simple alert for error for now
        } finally {
            setIsDeleting(false);
        }
    };

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

        // Sanitize payload
        const payload = {
            ...formData,
            software_id: formData.software_id === '' ? null : Number(formData.software_id)
        };

        if (initialData) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    const isPending = createMutation.isPending || updateMutation.isPending;

    const relationTypes = [
        { value: 'runs_on', label: 'Runs On' },
        { value: 'depends_on', label: 'Depends On' },
        { value: 'connects_to', label: 'Connects To' },
        { value: 'uses', label: 'Uses' },
        { value: 'hosts', label: 'Hosts' },
        { value: 'managed_by', label: 'Managed By' },
    ];

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>{initialData ? 'Edit Configuration Item' : 'Add New Configuration Item'}</h2>
                    <button onClick={onClose} className="close-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content-scrollable"> {/* Wrapper for scrolling content if needed */}
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
                                    {domains?.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((domain: any) => (
                                        <option key={domain.id} value={domain.name}>
                                            {domain.name}
                                        </option>
                                    ))}
                                    {!domains || domains.length === 0 && (
                                        <>
                                            <option value="arcelormittal.com">arcelormittal.com (Legacy)</option>
                                            <option value="local">local (Legacy)</option>
                                            <option value="internal">internal (Legacy)</option>
                                        </>
                                    )}
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
                                <label htmlFor="sla">SLA</label>
                                <input
                                    type="text"
                                    id="sla"
                                    name="sla"
                                    value={formData.sla}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g. Gold"
                                />
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
                                <label htmlFor="department">Abteilung</label>
                                <input
                                    type="text"
                                    id="department"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g. IT Operations"
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
                                <label htmlFor="service_provider">Service Provider</label>
                                <input
                                    type="text"
                                    id="service_provider"
                                    name="service_provider"
                                    value={formData.service_provider}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g. BTC, CGI"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact">Contact</label>
                                <input
                                    type="text"
                                    id="contact"
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Person or Team responsible"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="os_db_system">OS/DB System (Discovery)</label>
                                <input
                                    type="text"
                                    id="os_db_system"
                                    name="os_db_system"
                                    value={formData.os_db_system || ''}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Discovered string (e.g. Win10)"
                                />
                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                    The raw string found by discovery tools.
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="software_id">Software Model (DML)</label>
                                <select
                                    id="software_id"
                                    name="software_id"
                                    value={formData.software_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">-- No Direct Link --</option>
                                    {softwareList && softwareList.length > 0 ? (
                                        [...softwareList]
                                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                            .map((sw: any) => (
                                                <option key={sw.id} value={sw.id}>
                                                    {sw.name} ({sw.version || 'v?'})
                                                </option>
                                            ))
                                    ) : (
                                        <option disabled>Loading software...</option>
                                    )}
                                </select>
                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                    Link to an approved Software Catalog item.
                                </small>
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

                        {/* Relationship Section - Only when editing */}
                        {initialData && (
                            <div className="relationships-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                        <LinkIcon size={18} /> Relationships
                                    </h3>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setShowAddRelation(!showAddRelation)}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    >
                                        <Plus size={14} style={{ marginRight: '5px' }} /> Add Relation
                                    </button>
                                </div>

                                {showAddRelation && (
                                    <div className="add-relation-box" style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        marginBottom: '20px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>New Relationship</h4>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '150px' }}>
                                                <select
                                                    value={relationType}
                                                    onChange={(e) => setRelationType(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                >
                                                    {relationTypes.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                {selectedTarget ? (
                                                    <div style={{
                                                        padding: '8px',
                                                        border: '1px solid var(--primary-color)',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        background: 'var(--bg-primary)'
                                                    }}>
                                                        <span>{selectedTarget.name} <small>({selectedTarget.ci_type})</small></span>
                                                        <button type="button" onClick={() => { setSelectedTarget(null); setTargetSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <input
                                                            type="text"
                                                            placeholder="Search target CI..."
                                                            value={targetSearch}
                                                            onChange={(e) => setTargetSearch(e.target.value)}
                                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                        />
                                                        {targetProjectCandidates.length > 0 && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                left: 0,
                                                                right: 0,
                                                                background: 'var(--bg-secondary)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '4px',
                                                                maxHeight: '200px',
                                                                overflowY: 'auto',
                                                                zIndex: 10,
                                                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                                            }}>
                                                                {targetProjectCandidates.map(c => (
                                                                    <div
                                                                        key={c.id}
                                                                        onClick={() => { setSelectedTarget(c); setTargetProjectCandidates([]); }}
                                                                        style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                                                                        className="search-item"
                                                                    >
                                                                        <strong>{c.name}</strong> <small>({c.ci_type})</small>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                disabled={!selectedTarget}
                                                onClick={handleAddRelationship}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="relationships-list">
                                    {loadingRels ? (
                                        <p>Loading relationships...</p>
                                    ) : relationships.length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No relationships defined.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {relationships.map((rel) => (
                                                <div key={rel.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: 'var(--bg-secondary)',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                        <div style={{ fontWeight: rel.isSource ? 'bold' : 'normal', color: rel.isSource ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                                            {rel.isSource ? 'This CI' : rel.otherCI.name}
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                                                            <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                                                {rel.relationship_type.replace('_', ' ')}
                                                            </small>
                                                            <ArrowRight size={14} color="var(--text-secondary)" />
                                                        </div>

                                                        <div style={{ fontWeight: !rel.isSource ? 'bold' : 'normal', color: !rel.isSource ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                                            {rel.isSource ? rel.otherCI.name : 'This CI'}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => confirmDeleteRelationship(rel.id)}
                                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '5px' }}
                                                        title="Remove Relationship"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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

            <DeleteCIModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setRelationToDelete(null); }}
                onConfirm={handleDeleteRelationship}
                ciName="this relationship"
                title="Remove Relationship"
                message={<>Are you sure you want to remove this relationship?</>}
                isPending={isDeleting}
            />
        </div>
    );
};

export default AddCIModal;
