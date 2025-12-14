import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { relationshipAPI, ciAPI } from '../api/client';
import './AddCIModal.css'; // Reusing the same styles for consistency

interface ViewCIModalProps {
    isOpen: boolean;
    onClose: () => void;
    ci: any;
}

const ViewCIModal: React.FC<ViewCIModalProps> = ({ isOpen, onClose, ci }) => {
    const [relationships, setRelationships] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddRelation, setShowAddRelation] = useState(false);

    // Add Relation State
    const [relationType, setRelationType] = useState('runs_on');
    const [targetSearch, setTargetSearch] = useState('');
    const [targetProjectCandidates, setTargetProjectCandidates] = useState<any[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (isOpen && ci) {
            fetchRelationships();
            // Reset add state
            setShowAddRelation(false);
            setTargetSearch('');
            setSelectedTarget(null);
            setTargetProjectCandidates([]);
        }
    }, [isOpen, ci]);

    // Search for CIs when typing
    useEffect(() => {
        const searchCIs = async () => {
            if (targetSearch.length < 2) {
                setTargetProjectCandidates([]);
                return;
            }

            setIsSearching(true);
            try {
                // Using the list API to search
                const response = await ciAPI.list({
                    search: targetSearch,
                    page: 1,
                    page_size: 10
                });
                // Filter out the current CI
                const candidates = response.items.filter((item: any) => item.id !== ci.id);
                setTargetProjectCandidates(candidates);
            } catch (error) {
                console.error("Failed to search CIs", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchCIs, 500);
        return () => clearTimeout(timeoutId);
    }, [targetSearch, ci]);

    const fetchRelationships = async () => {
        if (!ci) return;
        setLoading(true);
        try {
            const data = await relationshipAPI.getByCI(ci.id);
            // Fetch potential details for related CIs if needed, but the basic API might return IDs only.
            // Wait, RelationshipResponse only gives source_ci_id, target_ci_id. 
            // We need names. We should probably fetch the related CIs or update the backend to include them.
            // For now, I'll fetch list of relevant CIs or just fetch individual CIs (slow).
            // BETTER: Update backend to include CI names or fetch all CIs in one go.
            // Let's assume for now we might need to fetch them. To keep it fast, maybe I can just fetch them?
            // Actually, let's look at the response again. 
            // The Relationship model has `source_ci` and `target_ci` relationships. 
            // `RelationshipResponse` inherits `RelationshipBase`.
            // Does `RelationshipResponse` include the nested CI objects? 
            // In schemas.py: 
            // class RelationshipResponse(RelationshipBase):
            //     id: int
            //     created_at: datetime
            //     class Config: from_attributes = True

            // It does NOT include the CI details by default unless Pydantic model has them or from_attributes pulls them if fields match.
            // But RelationshipBase only has IDs.
            // So I need to fetch the CI details for these IDs. 

            // To be efficient, I'll collect all IDs and maybe we can't do bulk fetch yet. 
            // I'll just fetch each one for now (N+1 problem but fine for small N).
            // Or better, I will assume the backend returns what is needed, 
            // but since I wrote the backend `RelationshipResponse` without extra fields, it won't return names.
            // I should update the backend schema to include CI names/details to avoid N+1 requests from frontend.

            // For this iteration, I'll stick to frontend fetching to avoid context switching back to backend file.
            // I'll resolve the CI names here.

            const enrichedrels = await Promise.all(data.map(async (rel: any) => {
                const isSource = rel.source_ci_id === ci.id;
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
            setLoading(false);
        }
    };

    const handleAddRelationship = async () => {
        if (!selectedTarget) return;
        try {
            await relationshipAPI.create({
                source_ci_id: ci.id,
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

    const handleDeleteRelationship = async (id: number) => {
        if (!confirm("Are you sure you want to remove this relationship?")) return;
        try {
            await relationshipAPI.delete(id);
            fetchRelationships();
        } catch (error) {
            console.error("Failed to delete relationship", error);
        }
    };

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
                            <div className="view-row">
                                <label>OS:</label>
                                <span>{ci.operating_system || '-'}</span>
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

                    {/* Relationships Section */}
                    <div className="relationships-section" style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LinkIcon size={20} /> Relationships
                            </h3>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowAddRelation(!showAddRelation)}
                                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                            >
                                <Plus size={16} style={{ marginRight: '5px' }} /> Add Relation
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
                                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>New Relationship</h4>
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
                                                <button onClick={() => { setSelectedTarget(null); setTargetSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
                            {loading ? (
                                <p>Loading relationships...</p>
                            ) : relationships.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No relationships defined.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {relationships.map((rel) => (
                                        <div key={rel.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: 'var(--bg-secondary)',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                {/* Start Node */}
                                                <div style={{ fontWeight: rel.isSource ? 'bold' : 'normal', color: rel.isSource ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                                    {rel.isSource ? 'This CI' : rel.otherCI.name}
                                                </div>

                                                {/* Relationship Arrow/Type */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                                                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                        {rel.relationship_type.replace('_', ' ')}
                                                    </small>
                                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                                        {rel.isSource ? <ArrowRight size={16} /> : <ArrowRight size={16} />}
                                                    </div>
                                                </div>

                                                {/* End Node */}
                                                <div style={{ fontWeight: !rel.isSource ? 'bold' : 'normal', color: !rel.isSource ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                                                    {rel.isSource ? rel.otherCI.name : 'This CI'}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteRelationship(rel.id)}
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
