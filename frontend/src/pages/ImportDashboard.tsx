import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importAPI } from '../api/client';
import { Play, Plus, RefreshCw, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Upload, FileText } from 'lucide-react';
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
    // Oracle Config
    host?: string;
    port?: string;
    service_name?: string;
    user?: string;
    password?: string;
    // CSV Config
    file_path?: string;
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

    // CSV Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    const uploadCsvMutation = useMutation({
        mutationFn: importAPI.uploadCSV,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['importLogs'] });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            alert('CSV imported successfully!');
        },
        onError: (error: any) => {
            alert('Failed to upload CSV');
            console.error(error);
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

    const handleTestConnection = () => {
        const payload = {
            source_type: newSourceData.source_type,
            config: JSON.stringify(importConfig)
        };
        testConnectionMutation.mutate(payload);
    };

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            uploadCsvMutation.mutate(selectedFile);
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
                {/* Quick Import Section */}
                <section className="quick-import-section">
                    <h2>Quick Import</h2>
                    <div className="upload-cont">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            id="csv-upload"
                        />
                        <div className="upload-area">
                            <label htmlFor="csv-upload" className="upload-label">
                                <div className="icon-wrapper">
                                    <FileText size={32} />
                                </div>
                                <div className="text-content">
                                    {selectedFile ? (
                                        <span className="filename">{selectedFile.name}</span>
                                    ) : (
                                        <span>Click to select CSV file</span>
                                    )}
                                </div>
                            </label>
                            <button
                                className="upload-btn"
                                onClick={handleUpload}
                                disabled={!selectedFile || uploadCsvMutation.isPending}
                            >
                                {uploadCsvMutation.isPending ? (
                                    <RefreshCw size={18} className="spin" />
                                ) : (
                                    <Upload size={18} />
                                )}
                                Upload
                            </button>
                        </div>
                        <p className="help-text">
                            Supports .csv files with columns: name, ci_type, status, etc.
                        </p>
                    </div>
                </section>

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
                                                <option value="idoit">i-doit API</option>
                                                <option value="oracle">Oracle DB</option>
                                                <option value="csv">CSV File (Server Path)</option>
                                            </select>
                                        </div>

                                        {newSourceData.source_type === 'csv' && (
                                            <div className="form-group">
                                                <label>CSV File Path (on server)</label>
                                                <input
                                                    type="text"
                                                    placeholder="/path/to/file.csv"
                                                    value={(importConfig as any).file_path || ''}
                                                    onChange={e => setImportConfig({ ...importConfig, file_path: e.target.value })}
                                                />
                                                <p className="help-text" style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
                                                    Must be an absolute path accessible by the backend container.
                                                </p>
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
                                    <button type="button" onClick={handleCreateSource} className="primary-btn">
                                        Create Source
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ImportDashboard;
