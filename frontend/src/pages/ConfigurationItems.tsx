import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ciAPI, exportAPI, healthAPI } from '../api/client';
import { Search, Plus, Edit2, Trash2, Eye, Download, ChevronDown, Activity, ArrowUp, ArrowDown, ArrowUpDown, Filter, FileJson } from 'lucide-react';
import AddCIModal from '../components/AddCIModal';
import ViewCIModal from '../components/ViewCIModal';
import DeleteCIModal from '../components/DeleteCIModal';
import HealthCheckModal from '../components/HealthCheckModal';
import './ConfigurationItems.css';

const ColumnFilter: React.FC<{
    columnKey: string;
    onSelect: (values: string[]) => void;
    currentValues?: string[];
}> = ({ columnKey, onSelect, currentValues = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const { data: options, isLoading, isError } = useQuery({
        queryKey: ['distinct', columnKey],
        queryFn: () => ciAPI.getDistinctValues(columnKey),
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
        retry: 1
    });

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filterableColumns = ['ci_type', 'department', 'location', 'os_db_system', 'cost_center', 'sla', 'service_provider', 'contact', 'environment', 'domain', 'software'];
    if (!filterableColumns.includes(columnKey)) return null;

    const handleCheckboxChange = (option: string) => {
        const newValues = currentValues.includes(option)
            ? currentValues.filter(v => v !== option)
            : [...currentValues, option];
        onSelect(newValues);
    };

    return (
        <div className="filter-wrapper" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', marginLeft: '4px' }}>
            <button
                className={`icon-btn small ${currentValues.length > 0 ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                style={{
                    padding: '2px',
                    opacity: currentValues.length > 0 ? 1 : 0.5,
                    color: currentValues.length > 0 ? '#F47D30' : 'inherit'
                }}
            >
                <Filter size={14} />
            </button>
            {isOpen && (
                <div className="filter-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: '#1A1B20',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px',
                    zIndex: 100,
                    minWidth: '200px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Filter by value</span>
                        {currentValues.length > 0 && (
                            <button
                                onClick={() => {
                                    onSelect([]);
                                    setIsOpen(false);
                                }}
                                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer' }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    {isLoading ? (
                        <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>Loading...</div>
                    ) : isError ? (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#EF4444' }}>Error loading values</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {options?.map((option: string) => (
                                <label
                                    key={option}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: '#E5E7EB',
                                        backgroundColor: 'transparent',
                                        userSelect: 'none'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <input
                                        type="checkbox"
                                        checked={currentValues.includes(option)}
                                        onChange={() => handleCheckboxChange(option)}
                                        style={{
                                            accentColor: '#F47D30',
                                            width: '14px',
                                            height: '14px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ flex: 1 }}>{option}</span>
                                </label>
                            ))}
                            {(!options || options.length === 0) && (
                                <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>No values found</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ConfigurationItems: React.FC = () => {
    const [searchParams] = useSearchParams();

    // Initialize state from URL params
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [ciType, setCiType] = useState(searchParams.get('ci_type') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortDesc, setSortDesc] = useState(false);

    // Parse other filters from URL
    const [filters, setFilters] = useState<Record<string, string[]>>(() => {
        const initialFilters: Record<string, string[]> = {};
        const filterableColumns = ['department', 'location', 'os_db_system', 'cost_center', 'sla', 'service_provider', 'contact', 'environment', 'domain', 'software'];

        filterableColumns.forEach(key => {
            const value = searchParams.get(key);
            if (value) {
                initialFilters[key] = [value];
            }
        });

        return initialFilters;
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCI, setEditingCI] = useState<any>(null);

    const [viewingCI, setViewingCI] = useState<{ ci: any; initialTab?: 'general' | 'technical' | 'raw' } | null>(null);
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
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // Default visible columns
    const DEFAULT_COLUMNS = ['name', 'ci_type', 'status', 'department', 'location', 'last_ping', 'actions'];

    // Available columns configuration
    const AVAILABLE_COLUMNS = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'ci_type', label: 'Type', sortable: true },
        { key: 'description', label: 'Description', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'software', label: 'Software Model', sortable: false },
        { key: 'department', label: 'Abteilung', sortable: true },
        { key: 'location', label: 'Location', sortable: true },
        { key: 'environment', label: 'Environment', sortable: true },
        { key: 'os_db_system', label: 'OS/DB System', visible: true },
        { key: 'domain', label: 'Domain', sortable: true },
        { key: 'cost_center', label: 'Cost Center', sortable: true },
        { key: 'service_provider', label: 'Service Provider', sortable: true },
        { key: 'contact', label: 'Contact', sortable: true },
        { key: 'sla', label: 'SLA', sortable: true },
        { key: 'technical_details', label: 'Technical Details', sortable: false },
        { key: 'raw_data', label: 'Raw Data', sortable: false },
        { key: 'last_ping', label: 'Last Ping', sortable: true },
        { key: 'created_at', label: 'Created At', sortable: true },
        { key: 'updated_at', label: 'Updated At', sortable: true },
        { key: 'relationships_summary', label: 'Runs_on', sortable: false },
        { key: 'actions', label: 'Actions', sortable: false },
    ];

    // Initialize visible columns from localStorage or default
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('ci_visible_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });

    // Save visible columns to localStorage whenever they change
    React.useEffect(() => {
        localStorage.setItem('ci_visible_columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const toggleColumn = (columnKey: string) => {
        setVisibleColumns(prev => {
            if (prev.includes(columnKey)) {
                // Don't allow hiding the Name column as it's essential
                if (columnKey === 'name') return prev;
                return prev.filter(k => k !== columnKey);
            }
            // Add column in the order defined in AVAILABLE_COLUMNS to keep table consistent
            const newColumns = [...prev, columnKey];
            return AVAILABLE_COLUMNS
                .filter(col => newColumns.includes(col.key))
                .map(col => col.key);
        });
    };

    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['cis', page, pageSize, search, ciType, status, sortBy, sortDesc, filters],
        queryFn: () => ciAPI.list({
            page,
            page_size: pageSize,
            search: search || undefined,
            ci_type: ciType || undefined,
            status: status || undefined,
            sort_by: sortBy,
            sort_desc: sortDesc,
            ...filters,
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

    const handleView = (ci: any, initialTab: 'general' | 'technical' | 'raw' = 'general') => {
        setViewingCI({ ci, initialTab });
    };

    const handleExport = async (format: 'csv' | 'excel') => {
        try {
            setShowExportMenu(false);
            const params = {
                ci_type: ciType || undefined,
                status: status || undefined,
                os_db_system: filters.os_db_system && filters.os_db_system.length > 0 ? filters.os_db_system : undefined,
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

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortDesc(!sortDesc);
        } else {
            setSortBy(field);
            setSortDesc(false);
        }
    };

    const renderSortIcon = (field: string) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortDesc ? <ArrowDown size={14} className="sort-icon" /> : <ArrowUp size={14} className="sort-icon" />;
    };

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPageSize(Number(e.target.value));
        setPage(1); // Reset to first page when changing page size
    };

    const renderCellContent = (ci: any, key: string) => {
        switch (key) {
            case 'name':
                return (
                    <span
                        className="ci-name"
                        title={ci.description || ''}
                        onClick={() => handleView(ci)}
                        style={{
                            cursor: 'pointer',
                            textDecoration: ci.description ? 'underline dotted' : 'none',
                            color: 'var(--primary)',
                            fontWeight: 500
                        }}
                    >
                        {ci.name}
                    </span>
                );
            case 'type':
            case 'ci_type':
                return <span className="ci-type-badge">{ci.ci_type.replace('_', ' ')}</span>;
            case 'status':
                return (
                    <span className={`badge badge-${getStatusColor(ci.status)}`}>
                        {ci.status}
                    </span>
                );
            case 'software':
                return ci.software ? (
                    <span className="software-badge">
                        {ci.software.name}
                    </span>
                ) : (
                    <span className="text-muted text-xs">-</span>
                );

            case 'sla':
                return ci.sla || '-';
            case 'technical_details':
                if (!ci.technical_details) return '-';
                // Try to make it readable if JSON, otherwise truncate
                try {
                    const json = JSON.parse(ci.technical_details);
                    const str = JSON.stringify(json);
                    return <span title={ci.technical_details} className="text-secondary text-xs">{str.substring(0, 50) + (str.length > 50 ? '...' : '')}</span>;
                } catch (e) {
                    return <span title={ci.technical_details} className="text-secondary text-xs">{ci.technical_details.substring(0, 50) + (ci.technical_details.length > 50 ? '...' : '')}</span>;
                }
            case 'raw_data':
                return ci.raw_data ? (
                    <button
                        className="icon-btn small"
                        title="View Raw Source Data"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleView(ci, 'raw');
                        }}
                        style={{ color: '#F47D30' }}
                    >
                        <FileJson size={16} />
                    </button>
                ) : (
                    <span className="text-muted text-xs">-</span>
                );
            case 'last_ping':
                return ci.last_ping_success ? (
                    <span className="ping-timestamp" title={new Date(ci.last_ping_success).toLocaleString()}>
                        {new Date(ci.last_ping_success).toLocaleDateString()}
                    </span>
                ) : (
                    <span className="text-muted">Never</span>
                );
            case 'created_at':
            case 'updated_at':
                return ci[key] ? new Date(ci[key]).toLocaleDateString() : '-';
            case 'relationships_summary':
                return ci.relationships_summary ? (
                    <span className="text-sm text-gray-400" title={ci.relationships_summary}>
                        {ci.relationships_summary.length > 50
                            ? ci.relationships_summary.substring(0, 50) + '...'
                            : ci.relationships_summary}
                    </span>
                ) : '-';
            case 'actions':
                return (
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
                );
            default:
                return ci[key] || '-';
        }
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
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                        >
                            <Eye size={18} />
                            <span>Columns</span>
                            <ChevronDown size={16} />
                        </button>
                        {showColumnMenu && (
                            <div className="dropdown-menu columns-menu" style={{ width: '200px' }}>
                                {AVAILABLE_COLUMNS.map(col => (
                                    <label key={col.key} className="dropdown-item checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.key)}
                                            onChange={() => toggleColumn(col.key)}
                                            disabled={col.key === 'name'}
                                        />
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
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
                        placeholder="Search by name, description, or department..."
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
                    <option value="os_db_system">OS/DB System</option>
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

                <select
                    className="filter-select"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    style={{ width: 'auto' }}
                >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
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
                                {AVAILABLE_COLUMNS
                                    .filter(col => visibleColumns.includes(col.key))
                                    .map(col => (
                                        <th
                                            key={col.key}
                                            className={`${col.sortable ? 'sortable-header' : ''} ${col.key === 'actions' ? 'sticky-actions' : ''}`}
                                        >
                                            <div className="th-content" style={{ justifyContent: 'space-between' }}>
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: col.sortable ? 'pointer' : 'default' }}
                                                    onClick={() => col.sortable && handleSort(col.key)}
                                                >
                                                    {col.label}
                                                    {col.sortable && renderSortIcon(col.key)}
                                                </div>
                                                <ColumnFilter
                                                    columnKey={col.key}
                                                    currentValues={filters[col.key]}
                                                    onSelect={(vals) => {
                                                        const newFilters = { ...filters };
                                                        if (vals && vals.length > 0) {
                                                            newFilters[col.key] = vals;
                                                        } else {
                                                            delete newFilters[col.key];
                                                        }
                                                        setFilters(newFilters);
                                                        setPage(1); // Reset to page 1 on filter change
                                                    }}
                                                />
                                            </div>
                                        </th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody>
                            {data?.items && data.items.length > 0 ? (
                                data.items.map((ci: any) => (
                                    <tr key={ci.id}>
                                        {AVAILABLE_COLUMNS
                                            .filter(col => visibleColumns.includes(col.key))
                                            .map(col => (
                                                <td key={col.key} className={col.key === 'actions' ? 'sticky-actions' : ''}>
                                                    {renderCellContent(ci, col.key)}
                                                </td>
                                            ))
                                        }
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={visibleColumns.length}>
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
                                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.total)} of {data.total} items
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
                                    disabled={page * pageSize >= data.total}
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
                ci={viewingCI?.ci}
                initialTab={viewingCI?.initialTab}
            />

            <DeleteCIModal
                isOpen={!!deletingCI}
                onClose={() => setDeletingCI(null)}
                onConfirm={confirmDelete}
                ciName={deletingCI?.name || ''}
                isPending={deleteMutation.isPending}
            />

            {/* Clear CIs Modal */}


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
