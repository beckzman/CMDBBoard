import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importAPI } from '../api/client';
import { Play, Plus, RefreshCw, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import FieldMappingEditor from '../components/FieldMappingEditor';
import ReconciliationEditor from '../components/ReconciliationEditor';
import './ImportDashboard.css';

interface ImportSource {
    id: number;
    name: string;
    source_type: string;
    is_active: boolean;
    last_run: string | null;
    schedule_cron: string | null;
}

interface ImportLog {
    id: number;
    import_type: string;
    source: string;
    status: string;
    records_processed: number;
    records_success: number;
    records_failed: number;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
}

interface ImportConfig {
    field_mapping: Record<string, string>;
    reconciliation: {
        key_field: string;
        match_strategy: string;
        conflict_resolution: Record<string, string>;
    };
}

const ImportDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [newSourceData, setNewSourceData] = useState({
        name: '',
        source_type: 'sharepoint',
        is_active: true,
        schedule_cron: ''
    });

    const [importConfig, setImportConfig] = useState<ImportConfig>({
        field_mapping: {
            name: 'Title'
        },
        reconciliation: {
            key_field: 'name',
            match_strategy: 'exact',
            conflict_resolution: {}
        }
    });

    // Queries
    const { data: sources, isLoading: isLoadingSources } = useQuery({
        queryKey: ['importSources'],
        queryFn: importAPI.listSources
    });

    const { data: logs, isLoading: isLoadingLogs } = useQuery({
        queryKey: ['importLogs'],
        queryFn: () => importAPI.getHistory(20),
        refetchInterval: 5000
    });

    // Mutations
    const createSourceMutation = useMutation({
        mutationFn: importAPI.createSource,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importSources'] });
            setIsCreateModalOpen(false);
            setModalStep(1);
            setNewSourceData({
                name: '',
                source_type: 'sharepoint',
                is_active: true,
                schedule_cron: ''
            });
            setImportConfig({
                field_mapping: { name: 'Title' },
                reconciliation: {
                    key_field: 'name',
                    match_strategy: 'exact',
                    conflict_resolution: {}
                }
            });
        }
    });

    const runSourceMutation = useMutation({
        mutationFn: importAPI.runSource,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importLogs'] });
            alert('Import job started successfully!');
        },
        onError: (error: any) => {
            alert('Failed to start import job');
            console.error(error);
        }
    });

    const handleCreateSource = () => {
        const payload = {
            ...newSourceData,
            config: JSON.stringify(importConfig)
        };
        createSourceMutation.mutate(payload);
    };

    const handleRunSource = (id: number) => {
        if (window.confirm('Are you sure you want to run this import now?')) {
            runSourceMutation.mutate(id);
        }
    };

    const handleNext = () => {
        if (modalStep < 3) setModalStep(modalStep + 1);
    };

    const handleBack = () => {
        if (modalStep > 1) setModalStep(modalStep - 1);
    };

    const mappedFields = Object.keys(importConfig.field_mapping);

    return (
        <div className="import-dashboard">
            <div className="page-header">
                <h1>Import Data</h1>
                <button
                    className="create-btn"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} />
                    New Source
                </button>
            </div>

            <div className="dashboard-grid">
                {/* Sources Section */}
                <section className="sources-section">
                    <h2>Import Sources</h2>
                    {isLoadingSources ? (
                        <div className="loading">Loading sources...</div>
                    ) : (
                        <div className="sources-list">
                            {sources?.map((source: ImportSource) => (
                                <div key={source.id} className="source-card">
                                    <div className="source-header">
                                        <h3>{source.name}</h3>
                                        <span className={`status - badge ${source.is_active ? 'active' : 'inactive'} `}>
                                            {source.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="source-details">
                                        <p><strong>Type:</strong> {source.source_type}</p>
                                        <p><strong>Schedule:</strong> {source.schedule_cron || 'Manual'}</p>
                                        <p><strong>Last Run:</strong> {source.last_run ? new Date(source.last_run).toLocaleString() : 'Never'}</p>
                                    </div>
                                    <div className="source-actions">
                                        <button
                                            className="run-btn"
                                            onClick={() => handleRunSource(source.id)}
                                            disabled={runSourceMutation.isPending}
                                        >
                                            <Play size={16} />
                                            Run Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {sources?.length === 0 && (
                                <p className="empty-state">No import sources configured.</p>
                            )}
                        </div>
                    )}
                </section>

                {/* Logs Section */}
                <section className="logs-section">
                    <div className="section-header">
                        <h2>Recent Activity</h2>
                        <button className="refresh-btn" onClick={() => queryClient.invalidateQueries({ queryKey: ['importLogs'] })}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {isLoadingLogs ? (
                        <div className="loading">Loading logs...</div>
                    ) : (
                        <div className="logs-list">
                            {logs?.map((log: ImportLog) => (
                                <div key={log.id} className={`log - item ${log.status} `}>
                                    <div className="log-icon">
                                        {log.status === 'success' && <CheckCircle size={20} className="text-green" />}
                                        {log.status === 'failed' && <XCircle size={20} className="text-red" />}
                                        {log.status === 'running' && <RefreshCw size={20} className="spin text-blue" />}
                                    </div>
                                    <div className="log-content">
                                        <div className="log-header">
                                            <span className="log-source">{log.source}</span>
                                            <span className="log-time">
                                                <Clock size={14} />
                                                {new Date(log.started_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="log-stats">
                                            <span>Processed: {log.records_processed}</span>
                                            <span>Success: {log.records_success}</span>
                                            <span>Failed: {log.records_failed}</span>
                                        </div>
                                        {log.error_message && (
                                            <div className="log-error">{log.error_message}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {logs?.length === 0 && (
                                <p className="empty-state">No import history found.</p>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Enhanced Create Modal */}
            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-large">
                        <div className="modal-header">
                            <h2>Add Import Source</h2>
                            <div className="step-indicator">
                                <span className={modalStep >= 1 ? 'active' : ''}>1. Basic Info</span>
                                <span className={modalStep >= 2 ? 'active' : ''}>2. Field Mapping</span>
                                <span className={modalStep >= 3 ? 'active' : ''}>3. Reconciliation</span>
                            </div>
                        </div>

                        <div className="modal-body">
                            {modalStep === 1 && (
                                <div className="step-content">
                                    <div className="form-group">
                                        <label>Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newSourceData.name}
                                            onChange={e => setNewSourceData({ ...newSourceData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Type</label>
                                        <select
                                            value={newSourceData.source_type}
                                            onChange={e => setNewSourceData({ ...newSourceData, source_type: e.target.value })}
                                        >
                                            <option value="sharepoint">SharePoint List</option>
                                            <option value="idoit">i-doit API</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Schedule (Cron)</label>
                                        <input
                                            type="text"
                                            placeholder="0 2 * * * (Optional)"
                                            value={newSourceData.schedule_cron}
                                            onChange={e => setNewSourceData({ ...newSourceData, schedule_cron: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {modalStep === 2 && (
                                <div className="step-content">
                                    <FieldMappingEditor
                                        mapping={importConfig.field_mapping}
                                        onChange={(mapping) => setImportConfig({ ...importConfig, field_mapping: mapping })}
                                    />
                                </div>
                            )}

                            {modalStep === 3 && (
                                <div className="step-content">
                                    <ReconciliationEditor
                                        config={importConfig.reconciliation}
                                        onChange={(recon) => setImportConfig({ ...importConfig, reconciliation: recon })}
                                        mappedFields={mappedFields}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                            {modalStep > 1 && (
                                <button type="button" onClick={handleBack} className="secondary-btn">
                                    <ChevronLeft size={16} />
                                    Back
                                </button>
                            )}
                            {modalStep < 3 ? (
                                <button type="button" onClick={handleNext} className="primary-btn">
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button type="button" onClick={handleCreateSource} className="primary-btn">
                                    Create Source
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportDashboard;
