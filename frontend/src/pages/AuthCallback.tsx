import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/client';

const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                // Redirect to login with error
                navigate('/login?error=' + error);
                return;
            }

            if (token) {
                try {
                    // Store token
                    localStorage.setItem('access_token', token);

                    // Fetch user info
                    const user = await authAPI.getCurrentUser();

                    // Update auth store
                    login(token, user);

                    // Redirect to home
                    navigate('/');
                } catch (err) {
                    console.error('Failed to fetch user info:', err);
                    navigate('/login?error=AuthenticationFailed');
                }
            } else {
                // No token, redirect to login
                navigate('/login');
            }
        };

        handleCallback();
    }, [searchParams, navigate, login]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F1014 0%, #1A1B20 100%)',
            color: 'white'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>
                    Authenticating...
                </div>
                <div className="spinner"></div>
            </div>
        </div>
    );
};

export default AuthCallback;
