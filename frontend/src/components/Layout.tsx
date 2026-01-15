import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ciAPI } from '../api/client';
import DeleteCIModal from './DeleteCIModal';
import {
    LayoutDashboard,
    Database,
    Upload,
    LogOut,
    ChevronRight,
    Bell,
    Search,
    Settings,
    ChevronLeft,
    Globe,
    Users,
    DollarSign,
    PieChart,
    Share2,
    Sun,
    Moon,
    Folder,
    Trash2
} from 'lucide-react';
import './Layout.css';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            className="icon-button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
};

const LayoutContent: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearType, setClearType] = useState<string>('');
    const [isClearing, setIsClearing] = useState(false);
    const queryClient = useQueryClient();

    const handleClearCIs = async () => {
        // if (!confirm(`Are you sure you want to delete ${clearType ? 'all ' + clearType : 'ALL'} Configuration Items? This action cannot be undone.`)) return;
        // The modal handles confirmation now, so we just run logic

        setIsClearing(true);
        try {
            await ciAPI.deleteAll(clearType || undefined);
            queryClient.invalidateQueries({ queryKey: ['cis'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setIsClearModalOpen(false);
            setClearType('');
        } catch (error) {
            console.error("Failed to clear CIs", error);
            alert("Failed to clear CIs");
        } finally {
            setIsClearing(false);
        }
    };

    const confirmClearCIs = () => {
        handleClearCIs();
    };
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/cis': return 'Configuration Items';
            case '/dependencies': return 'Dependency Graph';
            case '/import': return 'Import Data';
            case '/domains': return 'Domain Management';
            case '/users': return 'User Management';
            default: return 'CMDB';
        }
    };

    interface NavItem {
        path?: string;
        icon: React.ElementType;
        label: string;
        children?: NavItem[];
    }

    const navItems: NavItem[] = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/cis', icon: Database, label: 'Configuration Items' },
        { path: '/dependencies', icon: Share2, label: 'Dependency Graph' },
        { path: '/analysis', icon: PieChart, label: 'Analysis' },
        { path: '/reports/relations', icon: Share2, label: 'Relations Report' },
        { path: '/import', icon: Upload, label: 'Import Data' },
    ];

    if (user?.role === 'admin') {
        navItems.push({
            icon: Settings,
            label: 'Setup',
            children: [
                { path: '/domains', icon: Globe, label: 'Domains' },
                { path: '/users', icon: Users, label: 'Users' },
                { path: '/cost-rules', icon: DollarSign, label: 'Cost Rules' },
                { path: '/software', icon: Folder, label: 'Software (DML)' }
            ]
        });
    }



    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo-container">
                        <div className="logo-icon">AM</div>
                        {sidebarOpen && <span className="logo-text">CMDB</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="sidebar-content">
                    {navItems.map((item, index) => (
                        <div key={index}>
                            {item.path ? (
                                <Link
                                    to={item.path}
                                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                >
                                    <item.icon size={22} className="nav-icon" />
                                    {sidebarOpen && <span className="nav-label">{item.label}</span>}
                                    {location.pathname === item.path && <div className="active-indicator" />}
                                </Link>
                            ) : (
                                <>
                                    <div className={`nav-group-header ${!sidebarOpen ? 'collapsed' : ''}`}>
                                        <item.icon size={22} className="nav-icon" />
                                        {sidebarOpen && <span className="nav-label">{item.label}</span>}
                                    </div>
                                    {sidebarOpen && item.children?.map((child) => (
                                        <Link
                                            key={child.path}
                                            to={child.path!}
                                            className={`nav-link sub-link ${location.pathname === child.path ? 'active' : ''}`}
                                            style={{ paddingLeft: sidebarOpen ? '48px' : '20px' }}
                                        >
                                            {sidebarOpen && <child.icon size={18} className="nav-icon" />}
                                            {sidebarOpen && <span className="nav-label">{child.label}</span>}
                                        </Link>
                                    ))}
                                </>
                            )}
                        </div>
                    ))}

                    {user?.role === 'admin' && (
                        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                            {/* Separator or just spacing */}
                            <button
                                onClick={() => setIsClearModalOpen(true)}
                                className="nav-link"
                                style={{ color: '#ef4444', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Clear All Data"
                            >
                                <Trash2 size={22} className="nav-icon" />
                                {sidebarOpen && <span className="nav-label">Clear CIs</span>}
                            </button>
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="nav-link logout">
                        <LogOut size={22} className="nav-icon" />
                        {sidebarOpen && <span className="nav-label">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="main-wrapper">
                {/* Top Header */}
                <header className="app-header">
                    <div className="header-left">
                        <div className="breadcrumbs">
                            <span className="breadcrumb-item">ArcelorMittal</span>
                            <ChevronRight size={14} className="breadcrumb-separator" />
                            <span className="breadcrumb-item active">{getPageTitle(location.pathname)}</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Global Search..." />
                        </div>

                        <div className="header-actions">
                            <ThemeToggle />
                            <button className="icon-button">
                                <Bell size={20} />
                                <span className="notification-badge">3</span>
                            </button>
                            <button className="icon-button">
                                <Settings size={20} />
                            </button>
                        </div>

                        <div className="user-profile">
                            <div className="avatar">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user?.full_name || user?.username}</span>
                                <span className="user-role">{user?.role || 'User'}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="app-content">
                    <div className="content-container">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* Clear CIs Modal */}
            <DeleteCIModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onConfirm={confirmClearCIs}
                ciName="All Configuration Items"
                title="Clear Configuration Items"
                message={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                        <span>Select scope for deletion:</span>
                        <select
                            value={clearType}
                            onChange={(e) => setClearType(e.target.value)}
                            className="form-select"
                            style={{ width: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#222', color: '#fff' }}
                        >
                            <option value="">Delete EVERYTHING</option>
                            <option value="server">Server</option>
                            <option value="application">Application</option>
                            <option value="network_device">Network Device</option>
                            <option value="database">Database</option>
                            <option value="workstation">Workstation</option>
                            <option value="storage">Storage</option>
                            <option value="other">Other</option>
                        </select>
                        <div className="alert-box" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ef4444', color: '#ffaaaa', fontSize: '13px' }}>
                            <strong>Warning:</strong> This will delete all {clearType ? clearType : ''} items permanently.
                        </div>
                    </div>
                }
                isPending={isClearing}
            />
        </div>
    );
};

const Layout: React.FC = () => {
    return (
        <ThemeProvider>
            <LayoutContent />
        </ThemeProvider>
    );
};

export default Layout;
