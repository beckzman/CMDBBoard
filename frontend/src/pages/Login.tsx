import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import './Login.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authAPI.login(username, password);

            // Store token first so it's available for the next request
            localStorage.setItem('access_token', data.access_token);

            const user = await authAPI.getCurrentUser();

            login(data.access_token, user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-container">
                        <div className="logo">
                            <span className="logo-am">AM</span>
                        </div>
                    </div>
                    <h1>ITIL CMDB Dashboard</h1>
                    <p className="subtitle">ArcelorMittal Configuration Management</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <div className="divider">
                        <span>OR</span>
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary keycloak-button"
                        onClick={() => window.location.href = 'http://localhost:8000/api/auth/keycloak/login'}
                    >
                        Sign in with Keycloak
                    </button>
                </form>

                <div className="login-footer">
                    <p>Secure access to configuration management database</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
