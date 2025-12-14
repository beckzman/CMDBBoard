import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { authAPI } from './api/client';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import ConfigurationItems from './pages/ConfigurationItems';
import ImportDashboard from './pages/ImportDashboard';
import DomainManagement from './pages/DomainManagement';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
    const { isAuthenticated, user, setUser, logout } = useAuthStore();

    // Fetch user data on mount if token exists but user is not set
    useEffect(() => {
        const fetchUser = async () => {
            if (isAuthenticated && !user) {
                try {
                    const userData = await authAPI.getCurrentUser();
                    setUser(userData);
                } catch (error) {
                    // Token is invalid, logout
                    logout();
                }
            }
        };
        fetchUser();
    }, [isAuthenticated, user, setUser, logout]);

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="cis" element={<ConfigurationItems />} />
                        <Route path="import" element={<ImportDashboard />} />
                        <Route path="domains" element={<DomainManagement />} />
                        <Route path="users" element={<UserManagement />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
};

export default App;
