import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importAPI } from '../api/client';
import { Upload, Play, Clock, RefreshCw, AlertCircle, CheckCircle, ChevronRight, Edit2, Trash2, Plus, ChevronLeft, XCircle } from 'lucide-react';
import FieldMappingEditor from '../components/FieldMappingEditor';
import ReconciliationEditor from '../components/ReconciliationEditor';
import ConfirmationModal from '../components/ConfirmationModal';
import './ImportDashboard.css';

interface ImportSource {
    id: number;
    name: string;
    source_type: string;
    is_active: boolean;
    last_run: string | null;
    schedule_cron: string | null;
    config?: string; // Add config to interface for editing
}

interface ImportLog {
    id: number;
    import_type: string;
    source: string;
    status: string;
    records_processed: number;
    records_success: number;
    records_failed: number;
    records_created?: number;
    records_updated?: number;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
    details?: string | null;
}

interface ImportConfig {
    field_mapping: Record<string, string>;
    relationship_mapping?: any[];
    reconciliation: {
        key_field: string;
        match_strategy: string;
        update_mode: 'upsert' | 'update_only';
        conflict_resolution: Record<string, string>;
    };
    // SharePoint Config
    site_url?: string;
    list_name?: string;
    username?: string;
    password?: string;
    // i-doit Config
    api_url?: string;
    api_key?: string;
    category?: string;
    clean_fqdn?: boolean;
    // Oracle Config
    host?: string;
    port?: string;
    service_name?: string;
    user?: string;
    // CSV Config
    file_path?: string;
    // Baramundi Config
    verify_ssl?: boolean;
}

const ImportDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingLog, setViewingLog] = useState<ImportLog | null>(null);
    const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
    const [modalStep, setModalStep] = useState(1);
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
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
        relationship_mapping: [],
        reconciliation: {
            key_field: 'name',
            match_strategy: 'exact',
            update_mode: 'upsert',
            conflict_resolution: {}
        }
    });

    // ... (omitted lines)



    // Source Fields State
    const [sourceFields, setSourceFields] = useState<string[]>([]);
    const [categories, setCategories] = useState<{ id: string | number; name: string }[]>([]);

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
                    update_mode: 'upsert',
                    conflict_resolution: {}
                }
            });
        },
        onError: (error: any) => {
            alert(`Failed to create source: ${error.response?.data?.detail || error.message}`);
            console.error(error);
        }
    });

    const deleteSourceMutation = useMutation({
        mutationFn: importAPI.deleteSource,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importSources'] });
        },
        onError: (error: any) => {
            alert(`Failed to delete source: ${error.message || 'Unknown error'}`);
        }
    });

    const updateSourceMutation = useMutation({
        mutationFn: (data: any) => importAPI.updateSource(editingSourceId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importSources'] });
            setIsCreateModalOpen(false);
            setEditingSourceId(null);
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
                    update_mode: 'upsert',
                    conflict_resolution: {}
                }
            });
        },
        onError: (error: any) => {
            alert(`Failed to update source: ${error.message || 'Unknown error'}`);
        }
    });

    const handleDeleteSource = (id: number) => {
        if (window.confirm('Are you sure you want to delete this import source?')) {
            deleteSourceMutation.mutate(id);
        }
    };

    const handleEditSource = (source: ImportSource) => {
        setEditingSourceId(source.id);
        setNewSourceData({
            name: source.name,
            source_type: source.source_type,
            is_active: source.is_active,
            schedule_cron: source.schedule_cron || ''
        });
        if (source.config) {
            try {
                const config = JSON.parse(source.config);
                // Ensure defaults for new fields
                setImportConfig({
                    ...config,
                    field_mapping: config.field_mapping || {},
                    relationship_mapping: config.relationship_mapping || []
                });
            } catch (e) {
                console.error("Failed to parse config", e);
            }
        }
        setModalStep(1);
        setIsCreateModalOpen(true);
    };

    const runSourceMutation = useMutation({
        mutationFn: importAPI.runSource,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importLogs'] });
            alert('Import job started! Please check "Recent Activity" below for the result.');
        },
        onError: (error: any) => {
            alert('Failed to start import job');
            console.error(error);
        }
    });



    const uploadSourceFileMutation = useMutation({
        mutationFn: importAPI.uploadSourceFile,
        onSuccess: (data) => {
            setImportConfig({ ...importConfig, file_path: data.file_path });
            // alert(`File uploaded: ${data.filename}`); // Optional feedback
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
            alert(`Failed to upload file: ${errorMsg}`);
        }
    });

    const testConnectionMutation = useMutation({
        mutationFn: importAPI.testConnection,
        onSuccess: () => {
            alert('Connection Successful!');
        },
        onError: (error: any) => {
            alert(`Connection Failed: ${error.response?.data?.detail || error.message}`);
        }
    });

    const fetchSchemaMutation = useMutation({
        mutationFn: importAPI.getSchema,
        onSuccess: (data) => {
            setSourceFields(data.fields || []);
            alert(`Fetched ${data.fields?.length || 0} fields from source`);
        },
        onError: (error: any) => {
            alert(`Failed to fetch fields: ${error.response?.data?.detail || error.message}`);
        }
    });

    const fetchCategoriesMutation = useMutation({
        mutationFn: importAPI.getCategories,
        onSuccess: (data) => {
            setCategories(data.categories || []);
            // alert(`Fetched ${data.categories?.length || 0} object types`); // Optional: keep or remove success alert
        },
        onError: (error: any) => {
            console.error('Fetch categories error:', error);
            alert(`Failed to fetch categories: ${error.response?.data?.detail || error.message}`);
        }
    });

    const previewDataMutation = useMutation({
        mutationFn: importAPI.previewData,
        onSuccess: (data) => {
            setPreviewData(data.data || []);
            setIsPreviewModalOpen(true);
        },
        onError: (error: any) => {
            alert(`Failed to fetch preview: ${error.response?.data?.detail || error.message}`);
        }
    });

    const handleTestConnection = () => {
        const payload = {
            source_type: newSourceData.source_type,
            config: JSON.stringify(importConfig)
        };
        testConnectionMutation.mutate(payload);
    };

    const handleFetchFields = () => {
        const payload = {
            source_type: newSourceData.source_type,
            config: JSON.stringify(importConfig)
        };
        fetchSchemaMutation.mutate(payload);
    };

    const handleFetchCategories = () => {
        const payload = {
            source_type: newSourceData.source_type,
            config: JSON.stringify(importConfig)
        };
        fetchCategoriesMutation.mutate(payload);
    };

    const handlePreviewData = () => {
        const payload = {
            source_type: newSourceData.source_type,
            config: JSON.stringify(importConfig)
        };
        previewDataMutation.mutate(payload);
    };

    const handleCreateSource = () => {
        if (!newSourceData.name.trim()) {
            alert('Source name is required.');
            return;
        }
        const payload = {
            ...newSourceData,
            config: JSON.stringify(importConfig)
        };
        if (editingSourceId) {
            updateSourceMutation.mutate(payload);
        } else {
            createSourceMutation.mutate(payload);
        }
    };

    const [runConfirmationOpen, setRunConfirmationOpen] = useState(false);
    const [sourceToRun, setSourceToRun] = useState<{ id: number, name: string } | null>(null);

    const handleRunSource = (source: ImportSource) => {
        setSourceToRun({ id: source.id, name: source.name });
        setRunConfirmationOpen(true);
    };

    const confirmRunSource = () => {
        if (sourceToRun) {
            runSourceMutation.mutate(sourceToRun.id);
            setRunConfirmationOpen(false);
            setSourceToRun(null);
        }
    };



    const handleNext = () => {
        if (modalStep === 1) {
            if (!newSourceData.name.trim()) {
                alert('Please enter a source name.');
                return;
            }
            if (newSourceData.source_type === 'csv' && !(importConfig as any).file_path) {
                alert('Please enter a CSV file path.');
                return;
            }
        }
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
                    onClick={() => {
                        setEditingSourceId(null);
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
                                update_mode: 'upsert',
                                conflict_resolution: {}
                            }
                        });
                        setModalStep(1);
                        setIsCreateModalOpen(true);
                    }}
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
                        <div className="sources-list-container">
                            {(() => {
                                // Group sources by type
                                const groupedSources = sources?.reduce((acc: any, source: ImportSource) => {
                                    const type = source.source_type;
                                    if (!acc[type]) acc[type] = [];
                                    acc[type].push(source);
                                    return acc;
                                }, {}) || {};

                                const sourceTypes: Record<string, string> = {
                                    sharepoint: 'SharePoint Lists',
                                    idoit: 'i-doit API',
                                    oracle: 'Oracle Database',
                                    csv: 'CSV Files',
                                    vcenter: 'VMware vCenter',
                                    wsus: 'WSUS Database',
                                    baramundi: 'Baramundi Management Suite'
                                };

                                const groups = Object.keys(groupedSources);

                                if (groups.length === 0) {
                                    return <p className="empty-state">No import sources configured.</p>;
                                }

                                return groups.map(type => (
                                    <div key={type} className="source-group">
                                        <h3 className="source-group-header">
                                            {sourceTypes[type] || type.toUpperCase()}
                                            <span className="count-badge">{groupedSources[type].length}</span>
                                        </h3>
                                        <div className="sources-list">
                                            {groupedSources[type].map((source: ImportSource) => (
                                                <div key={source.id} className="source-card">
                                                    <div className="source-header">
                                                        <h3>{source.name}</h3>
                                                        <span className={`status-badge ${source.is_active ? 'active' : 'inactive'}`}>
                                                            {source.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <div className="source-details">
                                                        <p><strong>Schedule:</strong> {source.schedule_cron || 'Manual'}</p>
                                                        <p><strong>Last Run:</strong> {source.last_run ? new Date(source.last_run).toLocaleString() : 'Never'}</p>
                                                    </div>
                                                    <div className="source-actions">
                                                        <button
                                                            className="action-btn icon-btn"
                                                            title="Edit Source"
                                                            onClick={() => handleEditSource(source)}
                                                            style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn icon-btn delete-btn"
                                                            title="Delete Source"
                                                            onClick={() => handleDeleteSource(source.id)}
                                                            style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                        <button
                                                            className="run-btn"
                                                            onClick={() => handleRunSource(source)}
                                                            disabled={runSourceMutation.isPending}
                                                        >
                                                            <Play size={16} />
                                                            Run Now
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </section>

                {/* Logs Section */}
                < section className="logs-section" >
                    <div className="section-header">
                        <h2>Recent Activity</h2>
                        <button className="refresh-btn" onClick={() => queryClient.invalidateQueries({ queryKey: ['importLogs'] })}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {
                        isLoadingLogs ? (
                            <div className="loading">Loading logs...</div>
                        ) : (
                            <div className="logs-list">
                                {logs?.map((log: ImportLog) => (
                                    <div key={log.id} className={`log - item ${log.status} `}>
                                        <div className="log-icon">
                                            {log.status === 'success' && <CheckCircle size={20} className="text-green" />}
                                            {log.status === 'partial_success' && <AlertCircle size={20} className="text-orange" />}
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
                                                <span>Success: {log.records_success}
                                                    <span className="stat-detail" style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                                                        (Created: {log.records_created || 0}, Updated: {log.records_updated || 0})
                                                    </span>
                                                </span>
                                                <span>Failed: {log.records_failed}</span>
                                            </div>
                                            {log.error_message && (
                                                <div className="log-error">{log.error_message}</div>
                                            )}
                                            {log.records_failed > 0 && log.details && (
                                                <button
                                                    className="view-details-btn"
                                                    onClick={() => setViewingLog(log)}
                                                    style={{ marginTop: '5px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                                                >
                                                    View {log.records_failed} Failed Items
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {logs?.length === 0 && (
                                    <p className="empty-state">No import history found.</p>
                                )}
                            </div>
                        )
                    }
                </section >
            </div >

            <ConfirmationModal
                isOpen={runConfirmationOpen}
                onClose={() => {
                    setRunConfirmationOpen(false);
                    setSourceToRun(null);
                }}
                onConfirm={confirmRunSource}
                title="Run Import Job"
                message={
                    <span>
                        Are you sure you want to run the import for <strong>{sourceToRun?.name}</strong> now?
                        <br />
                        This will fetch the latest data and update CIs.
                    </span>
                }
                confirmText="Run Now"
                confirmColor="blue"
                icon="info"
                isPending={runSourceMutation.isPending}
            />

            {/* Enhanced Create Modal */}
            {
                isCreateModalOpen && (
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
                                                <option value="oracle">Oracle Database</option>
                                                <option value="csv">CSV File</option>
                                                <option value="vcenter">VMware vCenter</option>
                                                <option value="wsus">WSUS Database</option>
                                                <option value="baramundi">Baramundi Management Suite</option>
                                            </select>
                                        </div>

                                        {newSourceData.source_type === 'csv' && (
                                            <div className="form-group">
                                                <label>CSV File Path (on server)</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="/path/to/file.csv"
                                                        value={(importConfig as any).file_path || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, file_path: e.target.value })}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <label className="secondary-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
                                                        {uploadSourceFileMutation.isPending ? (
                                                            <RefreshCw size={16} className="spin" />
                                                        ) : (
                                                            <Upload size={16} />
                                                        )}
                                                        <span style={{ marginLeft: '4px' }}>Upload</span>
                                                        <input
                                                            type="file"
                                                            accept=".csv,.json,.xlsx"
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    uploadSourceFileMutation.mutate(e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <p className="help-text" style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
                                                    Upload a file to the server or enter an absolute path manually.
                                                </p>
                                            </div>
                                        )}

                                        {newSourceData.source_type === 'wsus' && (
                                            <>
                                                <div className="form-group">
                                                    <label>Host / IP</label>
                                                    <input
                                                        type="text"
                                                        value={(importConfig as any).host || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, host: e.target.value })}
                                                        placeholder="wsus-db-server"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Database</label>
                                                    <input
                                                        type="text"
                                                        value={(importConfig as any).database || 'SUSDB'}
                                                        onChange={e => setImportConfig({ ...importConfig, database: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Username</label>
                                                    <input
                                                        type="text"
                                                        value={(importConfig as any).user || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, user: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Password</label>
                                                    <input
                                                        type="password"
                                                        value={(importConfig as any).password || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, password: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Port (Default: 1433)</label>
                                                    <input
                                                        type="number"
                                                        value={(importConfig as any).port || 1433}
                                                        onChange={e => setImportConfig({ ...importConfig, port: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </>

                                        )}

                                        {newSourceData.source_type === 'baramundi' && (
                                            <div className="baramundi-config-section">
                                                <h3>Baramundi Connection Details</h3>
                                                <div className="form-group">
                                                    <label>API URL</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://baramundi.example.com/bConnect/v1"
                                                        value={(importConfig as any).api_url || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, api_url: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group-row">
                                                    <div className="form-group">
                                                        <label>Username</label>
                                                        <input
                                                            type="text"
                                                            value={(importConfig as any).username || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, username: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Password</label>
                                                        <input
                                                            type="password"
                                                            value={(importConfig as any).password || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, password: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={(importConfig as any).verify_ssl !== false}
                                                            onChange={e => setImportConfig({ ...importConfig, verify_ssl: e.target.checked })}
                                                            style={{ marginRight: '8px', width: 'auto' }}
                                                        />
                                                        Verify SSL Certificate
                                                    </label>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handlePreviewData}
                                                        disabled={previewDataMutation.isPending}
                                                    >
                                                        {previewDataMutation.isPending ? 'Loading...' : 'Preview Data'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handleTestConnection}
                                                        disabled={testConnectionMutation.isPending}
                                                    >
                                                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {newSourceData.source_type === 'vcenter' && (
                                            <div className="vcenter-config-section">
                                                <h3>vCenter Connection Details</h3>
                                                <div className="form-group-row">
                                                    <div className="form-group" style={{ flex: 2 }}>
                                                        <label>Host / IP Address</label>
                                                        <input
                                                            type="text"
                                                            placeholder="vcenter.example.com"
                                                            value={(importConfig as any).host || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, host: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Port</label>
                                                        <input
                                                            type="text"
                                                            placeholder="443"
                                                            value={(importConfig as any).port || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, port: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group-row">
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Username</label>
                                                        <input
                                                            type="text"
                                                            placeholder="administrator@vsphere.local"
                                                            value={(importConfig as any).username || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, username: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Password</label>
                                                        <input
                                                            type="password"
                                                            value={(importConfig as any).password || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, password: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handlePreviewData}
                                                        disabled={previewDataMutation.isPending}
                                                    >
                                                        {previewDataMutation.isPending ? 'Loading...' : 'Preview Data'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handleTestConnection}
                                                        disabled={testConnectionMutation.isPending}
                                                    >
                                                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                                    </button>
                                                </div>
                                                <p className="help-text" style={{ marginTop: '10px', color: '#888', fontSize: '12px' }}>
                                                    Note: SSL verification is disabled for internal connections. ensure the port (default 443) is correct.
                                                </p>
                                            </div>
                                        )}

                                        {newSourceData.source_type === 'sharepoint' && (
                                            <div className="oracle-config-section">
                                                <h3>SharePoint Connection Details</h3>
                                                <div className="form-group">
                                                    <label>SharePoint Site URL</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://yourtenant.sharepoint.com/sites/yoursite"
                                                        value={(importConfig as any).site_url || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, site_url: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>List Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. CMDB Assets"
                                                        value={(importConfig as any).list_name || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, list_name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group-row">
                                                    <div className="form-group">
                                                        <label>Username / Client ID</label>
                                                        <input
                                                            type="text"
                                                            placeholder="user@domain.com or client_id"
                                                            value={(importConfig as any).username || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, username: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Password / Client Secret</label>
                                                        <input
                                                            type="password"
                                                            value={(importConfig as any).password || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, password: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {newSourceData.source_type === 'idoit' && (
                                            <div className="oracle-config-section">
                                                <h3>i-doit API Configuration</h3>
                                                <div className="form-group">
                                                    <label>API URL</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://your-idoit-server/src/jsonrpc.php"
                                                        value={(importConfig as any).api_url || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, api_url: e.target.value })}
                                                    />
                                                    <p className="help-text" style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
                                                        Full URL to i-doit JSON-RPC API endpoint
                                                    </p>
                                                </div>
                                                <div className="form-group">
                                                    <label>API Key</label>
                                                    <input
                                                        type="password"
                                                        placeholder="Your i-doit API key"
                                                        value={(importConfig as any).api_key || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, api_key: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                                    <input
                                                        type="checkbox"
                                                        id="clean-fqdn"
                                                        checked={(importConfig as any).clean_fqdn || false}
                                                        onChange={e => setImportConfig({ ...importConfig, clean_fqdn: e.target.checked })}
                                                    />
                                                    <label htmlFor="clean-fqdn" style={{ marginBottom: 0, cursor: 'pointer' }}>
                                                        Clean FQDN to Hostname (e.g. server.domain.com → server)
                                                    </label>
                                                </div>
                                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '10px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label>Object Type (Constant)</label>
                                                        <select
                                                            value={(importConfig as any).category || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, category: e.target.value })}
                                                        >
                                                            <option value="">-- All Types --</option>
                                                            {categories.length > 0 ? (
                                                                categories.map(cat => (
                                                                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.id})</option>
                                                                ))
                                                            ) : (
                                                                (importConfig as any).category && <option value={(importConfig as any).category}>{(importConfig as any).category}</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handleFetchCategories}
                                                        disabled={fetchCategoriesMutation.isPending}
                                                        style={{ marginBottom: '2px' }}
                                                    >
                                                        {fetchCategoriesMutation.isPending ? 'Fetching...' : 'Fetch Types'}
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handlePreviewData}
                                                        disabled={previewDataMutation.isPending}
                                                    >
                                                        {previewDataMutation.isPending ? 'Loading...' : 'Preview Data'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handleTestConnection}
                                                        disabled={testConnectionMutation.isPending}
                                                    >
                                                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {newSourceData.source_type === 'oracle' && (
                                            <div className="oracle-config-section">
                                                <h3>Oracle Connection Details</h3>
                                                <div className="form-group">
                                                    <label>Host</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 192.168.1.100"
                                                        value={(importConfig as any).host || ''}
                                                        onChange={e => setImportConfig({ ...importConfig, host: e.target.value })}
                                                    />
                                                </div>
                                                <div className="form-group-row">
                                                    <div className="form-group">
                                                        <label>Port</label>
                                                        <input
                                                            type="text"
                                                            placeholder="1521"
                                                            value={(importConfig as any).port || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, port: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Service Name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="ORCL"
                                                            value={(importConfig as any).service_name || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, service_name: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group-row">
                                                    <div className="form-group">
                                                        <label>Username</label>
                                                        <input
                                                            type="text"
                                                            value={(importConfig as any).user || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, user: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Password</label>
                                                        <input
                                                            type="password"
                                                            value={(importConfig as any).password || ''}
                                                            onChange={e => setImportConfig({ ...importConfig, password: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handlePreviewData}
                                                        disabled={previewDataMutation.isPending}
                                                    >
                                                        {previewDataMutation.isPending ? 'Loading...' : 'Preview Data'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={handleTestConnection}
                                                        disabled={testConnectionMutation.isPending}
                                                    >
                                                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

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
                                        <div style={{ marginBottom: '1rem' }}>
                                            <button
                                                type="button"
                                                onClick={handleFetchFields}
                                                className="secondary-btn"
                                                disabled={fetchSchemaMutation.isPending}
                                                style={{ marginBottom: '1rem' }}
                                            >
                                                {fetchSchemaMutation.isPending ? 'Fetching...' : 'Fetch Fields from Source'}
                                            </button>
                                            {sourceFields.length > 0 && (
                                                <p style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>
                                                    {sourceFields.length} fields available. Start typing in Source Field to see suggestions.
                                                </p>
                                            )}
                                        </div>
                                        <FieldMappingEditor
                                            mapping={importConfig.field_mapping}
                                            relationshipMapping={importConfig.relationship_mapping}
                                            onChange={(newMapping, newRelMapping) => {
                                                const updates: any = { field_mapping: newMapping };
                                                if (newRelMapping) {
                                                    updates.relationship_mapping = newRelMapping;
                                                }
                                                setImportConfig({
                                                    ...importConfig,
                                                    ...updates
                                                });
                                            }}
                                            sourceFields={sourceFields}
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

                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    className="secondary-btn"
                                    disabled={testConnectionMutation.isPending}
                                    style={{ marginRight: 'auto' }}
                                >
                                    {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                                </button>

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
                                    <button
                                        type="button"
                                        onClick={handleCreateSource}
                                        className="primary-btn"
                                        disabled={createSourceMutation.isPending || updateSourceMutation.isPending}
                                    >
                                        {createSourceMutation.isPending || updateSourceMutation.isPending ? 'Saving...' : (editingSourceId ? 'Save Changes' : 'Create Source')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Log Details Modal */}
            {
                viewingLog && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#1A1B20', color: '#FFFFFF' }}>
                            <div className="modal-header">
                                <h2>Import Failures</h2>
                                <button className="close-btn" onClick={() => setViewingLog(null)} style={{ background: 'none', border: 'none', color: '#B0B2B8', cursor: 'pointer' }}>
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ overflowY: 'auto', padding: '1rem' }}>
                                {(() => {
                                    try {
                                        const details = JSON.parse(viewingLog.details || '[]');
                                        if (!details.length) return <p>No detailed errors found.</p>;
                                        return details.map((err: any, i: number) => (
                                            <div key={i} className="error-item" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                                <div style={{ color: '#FCA5A5', fontWeight: 500, marginBottom: '0.25rem' }}>{err.error}</div>
                                                <pre style={{ background: '#0F1012', color: '#D1D5DB', padding: '0.75rem', borderRadius: '4px', fontSize: '12px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {err.record}
                                                </pre>
                                            </div>
                                        ));
                                    } catch (e) {
                                        return <p>Invalid details format.</p>;
                                    }
                                })()}
                            </div>
                            <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="secondary-btn" onClick={() => setViewingLog(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Preview Modal */}
            {
                isPreviewModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-large" style={{ maxWidth: '900px', width: '90%' }}>
                            <div className="modal-header">
                                <h2>Data Preview (First 5 Items)</h2>
                                <button className="close-btn" onClick={() => setIsPreviewModalOpen(false)}>
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                {previewData && previewData.length > 0 ? (
                                    <div className="preview-container" style={{ maxHeight: '500px', overflow: 'auto', background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                                        <pre style={{ color: '#e2e8f0', fontSize: '13px', margin: 0 }}>
                                            {JSON.stringify(previewData, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <p className="empty-state">No data returned from source.</p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="secondary-btn" onClick={() => setIsPreviewModalOpen(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default ImportDashboard;
