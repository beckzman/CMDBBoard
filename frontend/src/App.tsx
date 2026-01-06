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
import CostRules from './pages/CostRules';
import Analysis from './pages/Analysis';
import AnalysisCost from './pages/reports/AnalysisCost';
import AnalysisGrowth from './pages/reports/AnalysisGrowth';
import AnalysisOS from './pages/reports/AnalysisOS';
import AnalysisDB from './pages/reports/AnalysisDB';

import AnalysisSLA from './pages/reports/AnalysisSLA';
import DependencyGraph from './pages/DependencyGraph';
import SoftwareCatalog from './pages/SoftwareCatalog';
import Layout from './components/Layout';


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
                        <Route path="analysis" element={<Analysis />} />
                        <Route path="analysis/cost" element={<AnalysisCost />} />
                        <Route path="analysis/growth" element={<AnalysisGrowth />} />
                        <Route path="analysis/os" element={<AnalysisOS />} />
                        <Route path="analysis/db" element={<AnalysisDB />} />
                        <Route path="analysis/sla" element={<AnalysisSLA />} />
                        <Route path="import" element={<ImportDashboard />} />
                        <Route path="domains" element={<DomainManagement />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="cost-rules" element={<CostRules />} />
                        <Route path="dependencies" element={<DependencyGraph />} />
                        <Route path="software" element={<SoftwareCatalog />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
};

export default App;
