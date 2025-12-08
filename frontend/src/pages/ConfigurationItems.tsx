import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ciAPI, exportAPI, healthAPI } from '../api/client';
import { Search, Filter, Plus, Edit2, Trash2, Eye, Download, ChevronDown, Activity } from 'lucide-react';
import AddCIModal from '../components/AddCIModal';
import ViewCIModal from '../components/ViewCIModal';
import DeleteCIModal from '../components/DeleteCIModal';
import HealthCheckModal from '../components/HealthCheckModal';
import './ConfigurationItems.css';

const ConfigurationItems: React.FC = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [ciType, setCiType] = useState('');
    const [status, setStatus] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCI, setEditingCI] = useState<any>(null);

    const [viewingCI, setViewingCI] = useState<any>(null);
    const [deletingCI, setDeletingCI] = useState<any>(null);
    const [healthCheckState, setHealthCheckState] = useState<{
        isOpen: boolean;
        isLoading: boolean;
        ciName: string;
        result: { status: 'alive' | 'unreachable' | null; details: string; ip_address?: string | null } | null;
    }>({
        isOpen: false,
        isLoading: false,
        ciName: '',
        result: null
    });
    const [showExportMenu, setShowExportMenu] = useState(false);

    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['cis', page, search, ciType, status],
        queryFn: () => ciAPI.list({
            page,
            page_size: 10,
            search: search || undefined,
            ci_type: ciType || undefined,
            status: status || undefined,
        }),
    });

    const deleteMutation = useMutation({
        mutationFn: ciAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cis'] });
            setDeletingCI(null);
        },
    });

    const handleDeleteClick = (ci: any) => {
        setDeletingCI(ci);
    };

    const confirmDelete = () => {
        if (deletingCI) {
            deleteMutation.mutate(deletingCI.id);
        }
    };

    const handleEdit = (ci: any) => {
        setEditingCI(ci);
        setIsAddModalOpen(true);
    };

    const handleView = (ci: any) => {
        setViewingCI(ci);
    };

    const handleExport = async (format: 'csv' | 'excel') => {
        try {
            setShowExportMenu(false);
            const params = {
                ci_type: ciType || undefined,
                status: status || undefined,
            };

            const blob = format === 'csv'
                ? await exportAPI.exportCSV(params)
                : await exportAPI.exportExcel(params);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cmdb_export_${ciType || 'all'}.${format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    };

    const handleHealthCheck = async (ci: any) => {
        try {
            setHealthCheckState({
                isOpen: true,
                isLoading: true,
                ciName: ci.name,
                result: null
            });

            console.log(`Checking health for ${ci.name}...`);
            const result = await healthAPI.checkHost(ci.id);

            setHealthCheckState(prev => ({
                ...prev,
                isLoading: false,
                result: {
                    status: result.status,
                    details: result.status === 'alive'
                        ? `Latency: ${result.details}`
                        : `Error: ${result.details}`,
                    ip_address: result.ip_address
                }
            }));
        } catch (error: any) {
            console.error('Health check failed:', error);
            setHealthCheckState(prev => ({
                ...prev,
                isLoading: false,
                result: {
                    status: 'unreachable',
                    details: error.response?.data?.detail || 'Connection failed',
                    ip_address: null
                }
            }));
        }
    };

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

    return (
        <div className="ci-container">
            <div className="ci-header">
                <div>
                    <h1>Configuration Items</h1>
                    <p>Manage your IT assets and configuration items</p>
                </div>
                <div className="ci-actions">
                    <div className="export-dropdown">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <Download size={18} />
                            <span>Export</span>
                            <ChevronDown size={16} />
                        </button>
                        {showExportMenu && (
                            <div className="dropdown-menu">
                                <button onClick={() => handleExport('csv')}>
                                    Export to CSV
                                </button>
                                <button onClick={() => handleExport('excel')}>
                                    Export to Excel
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus size={18} />
                        <span>Add New Item</span>
                    </button>
                </div>
            </div>

            <div className="ci-controls">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, description, or owner..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    value={ciType}
                    onChange={(e) => setCiType(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="server">Server</option>
                    <option value="application">Application</option>
                    <option value="network_device">Network Device</option>
                    <option value="database">Database</option>
                    <option value="workstation">Workstation</option>
                    <option value="storage">Storage</option>
                    <option value="other">Other</option>
                </select>

                <select
                    className="filter-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="retired">Retired</option>
                    <option value="planned">Planned</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading configuration items...</p>
                </div>
            ) : (
                <div className="ci-table-container">
                    <table className="ci-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Owner</th>
                                <th>Location</th>
                                <th>Last Ping</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items && data.items.length > 0 ? (
                                data.items.map((ci: any) => (
                                    <tr key={ci.id}>
                                        <td>
                                            <span className="ci-name">{ci.name}</span>
                                        </td>
                                        <td>
                                            <span className="ci-type-badge">
                                                {ci.ci_type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusColor(ci.status)}`}>
                                                {ci.status}
                                            </span>
                                        </td>
                                        <td>{ci.owner || '-'}</td>
                                        <td>{ci.location || '-'}</td>
                                        <td>
                                            {ci.last_ping_success ? (
                                                <span className="ping-timestamp" title={new Date(ci.last_ping_success).toLocaleString()}>
                                                    {new Date(ci.last_ping_success).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-muted">Never</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="icon-btn"
                                                    title="Check Health"
                                                    onClick={() => handleHealthCheck(ci)}
                                                >
                                                    <Activity size={18} />
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    title="View Details"
                                                    onClick={() => handleView(ci)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    title="Edit"
                                                    onClick={() => handleEdit(ci)}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className="icon-btn delete"
                                                    title="Delete"
                                                    onClick={() => handleDeleteClick(ci)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <p>No configuration items found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {data?.total > 0 && (
                        <div className="pagination">
                            <div className="pagination-info">
                                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} items
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="page-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className="page-btn"
                                    disabled={page * 10 >= data.total}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AddCIModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingCI(null);
                }}
                initialData={editingCI}
            />

            <ViewCIModal
                isOpen={!!viewingCI}
                onClose={() => setViewingCI(null)}
                ci={viewingCI}
            />

            <DeleteCIModal
                isOpen={!!deletingCI}
                onClose={() => setDeletingCI(null)}
                onConfirm={confirmDelete}
                ciName={deletingCI?.name || ''}
                isPending={deleteMutation.isPending}
            />

            <HealthCheckModal
                isOpen={healthCheckState.isOpen}
                onClose={() => setHealthCheckState(prev => ({ ...prev, isOpen: false }))}
                isLoading={healthCheckState.isLoading}
                ciName={healthCheckState.ciName}
                result={healthCheckState.result}
            />
        </div>
    );
};

export default ConfigurationItems;
