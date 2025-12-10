import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../api/client';
import { Users, Shield, Eye, Edit, Trash2, X, Check, Key, UserPlus } from 'lucide-react';
import './ConfigurationItems.css';

const UserManagement: React.FC = () => {
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ full_name: '', role: '', is_active: true });
    const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');
    const [createUserModal, setCreateUserModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'viewer'
    });
    const [createError, setCreateError] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: userAPI.list,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => userAPI.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingUser(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: userAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: ({ id, password }: { id: number; password: string }) =>
            userAPI.resetPassword(id, password),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setResetPasswordUser(null);
            setNewPassword('');
        },
    });

    const createMutation = useMutation({
        mutationFn: userAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setCreateUserModal(false);
            setCreateError('');
            setCreateForm({
                username: '',
                email: '',
                full_name: '',
                password: '',
                role: 'viewer'
            });
        },
        onError: (err: any) => {
            setCreateError(err.response?.data?.detail || 'Failed to create user');
        },
    });


    const handleEdit = (user: any) => {
        setEditingUser(user);
        setEditForm({
            full_name: user.full_name || '',
            role: user.role,
            is_active: user.is_active
        });
    };

    const handleSave = () => {
        if (editingUser) {
            updateMutation.mutate({
                id: editingUser.id,
                data: editForm
            });
        }
    };

    const handleResetPassword = () => {
        if (resetPasswordUser && newPassword.length >= 6) {
            resetPasswordMutation.mutate({
                id: resetPasswordUser.id,
                password: newPassword
            });
        }
    };


    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield size={16} className="text-orange" />;
            case 'editor': return <Edit size={16} className="text-blue" />;
            case 'viewer': return <Eye size={16} className="text-gray" />;
            default: return null;
        }
    };

    // Filter users based on active status
    const filteredUsers = users?.filter((user: any) => showInactive || user.is_active) || [];

    return (
        <div className="ci-container">
            <div className="ci-header">
                <div>
                    <h1>User Management</h1>
                    <p>Manage user accounts and permissions</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        <span>Show inactive users</span>
                    </label>
                    <button
                        className="btn btn-primary"
                        onClick={() => setCreateUserModal(true)}
                    >
                        <UserPlus size={18} />
                        <span>Add User</span>
                    </button>
                </div>
            </div>

            <div className="ci-table-container">
                <div className="ci-table-wrapper">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <table className="ci-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th style={{ width: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers && filteredUsers.length > 0 ? (
                                    filteredUsers.map((user: any) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Users size={16} className="text-secondary" />
                                                    <span className="ci-name">{user.username}</span>
                                                </div>
                                            </td>
                                            <td>{user.full_name || '-'}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {getRoleIcon(user.role)}
                                                    <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="icon-btn edit"
                                                        title="Edit"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        title="Reset Password"
                                                        onClick={() => setResetPasswordUser(user)}
                                                    >
                                                        <Key size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn delete"
                                                        title="Deactivate"
                                                        onClick={() => {
                                                            if (confirm(`Deactivate user "${user.username}"?`)) {
                                                                deleteMutation.mutate(user.id);
                                                            }
                                                        }}
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
                                                <p>No users found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Edit User</h2>
                            <button onClick={() => setEditingUser(null)} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    className="form-select"
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.is_active}
                                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                    />
                                    <span>Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setEditingUser(null)} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={updateMutation.isPending}
                            >
                                <Check size={18} />
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordUser && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>Reset Password</h2>
                            <button onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-content">
                            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                Reset password for user: <strong>{resetPasswordUser.username}</strong>
                            </p>

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                className="btn btn-primary"
                                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                            >
                                <Key size={18} />
                                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {createUserModal && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Add New User</h2>
                            <button onClick={() => setCreateUserModal(false)} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="form-group">
                                <label>Username *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                    placeholder="Enter username"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={createForm.full_name}
                                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                    placeholder="Enter password (min 6 characters)"
                                    minLength={6}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    className="form-select"
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setCreateUserModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={() => createMutation.mutate(createForm)}
                                className="btn btn-primary"
                                disabled={createMutation.isPending || !createForm.username || !createForm.email || !createForm.password || createForm.password.length < 6}
                            >
                                <UserPlus size={18} />
                                {createMutation.isPending ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;


