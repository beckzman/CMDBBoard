import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
    LayoutDashboard,
    Database,
    Upload,
    Download,
    LogOut,
    ChevronRight,
    Bell,
    Search,
    Settings,
    ChevronLeft
} from 'lucide-react';
import './Layout.css';

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
            case '/import': return 'Import Data';
            case '/export': return 'Export Data';
            default: return 'CMDB';
        }
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/cis', icon: Database, label: 'Configuration Items' },
        { path: '/import', icon: Upload, label: 'Import Data' },
        { path: '/export', icon: Download, label: 'Export Data' },
    ];

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
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <item.icon size={22} className="nav-icon" />
                            {sidebarOpen && <span className="nav-label">{item.label}</span>}
                            {location.pathname === item.path && <div className="active-indicator" />}
                        </Link>
                    ))}
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
        </div>
    );
};

export default Layout;
