import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Database, Upload, Download, LogOut, Menu } from 'lucide-react';
import './Layout.css';

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-am">AM</span>
                    </div>
                    {sidebarOpen && (
                        <div className="sidebar-title">
                            <h2>CMDB</h2>
                            <p>Dashboard</p>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <Link to="/" className="nav-item">
                        <LayoutDashboard size={20} />
                        {sidebarOpen && <span>Dashboard</span>}
                    </Link>
                    <Link to="/cis" className="nav-item">
                        <Database size={20} />
                        {sidebarOpen && <span>Configuration Items</span>}
                    </Link>
                    <Link to="/import" className="nav-item">
                        <Upload size={20} />
                        {sidebarOpen && <span>Import Data</span>}
                    </Link>
                    <Link to="/export" className="nav-item">
                        <Download size={20} />
                        {sidebarOpen && <span>Export Data</span>}
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    {sidebarOpen && user && (
                        <div className="user-info">
                            <div className="user-avatar">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <p className="user-name">{user.full_name || user.username}</p>
                                <p className="user-role">{user.role}</p>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="logout-button">
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="main-content">
                <header className="top-bar">
                    <button
                        className="menu-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu size={24} />
                    </button>
                    <div className="top-bar-title">
                        <h1>ArcelorMittal ITIL CMDB</h1>
                    </div>
                </header>

                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
