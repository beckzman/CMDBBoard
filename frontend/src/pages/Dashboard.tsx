import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api/client';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Server, Activity, TrendingUp, Upload } from 'lucide-react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dashboardAPI.getStats,
    });

    const { data: recentCIs } = useQuery({
        queryKey: ['recent-cis'],
        queryFn: () => dashboardAPI.getRecent(5),
    });

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const ciTypeData = stats?.cis_by_type ? Object.entries(stats.cis_by_type).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
    })) : [];

    const ciStatusData = stats?.cis_by_status ? Object.entries(stats.cis_by_status).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
    })) : [];

    const ciDepartmentData = stats?.cis_by_department ? Object.entries(stats.cis_by_department)
        .map(([name, value]) => ({
            name: name,
            value: value as number,
        }))
        .sort((a, b) => b.value - a.value) : [];

    const ciLocationData = stats?.cis_by_location ? Object.entries(stats.cis_by_location)
        .map(([name, value]) => ({
            name: name,
            value: value as number,
        }))
        .sort((a, b) => b.value - a.value) : [];

    const costsData = stats?.costs_by_cost_center ? Object.entries(stats.costs_by_cost_center)
        .map(([name, value]) => ({
            name: name,
            value: value as number,
        }))
        .sort((a, b) => b.value - a.value) : [];

    // Transform cis_by_dept_and_type for Stacked Bar Chart
    const ciDeptTypeData = React.useMemo(() => {
        if (!stats?.cis_by_dept_and_type) return [];

        return Object.entries(stats.cis_by_dept_and_type).map(([dept, types]) => {
            const entry: any = { name: dept };
            Object.entries(types as Record<string, number>).forEach(([type, count]) => {
                // Normalize type key for display (e.g. "windows_server" -> "Windows Server")
                const normalizedType = type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                entry[normalizedType] = count;
            });
            return entry;
        }).sort((a, b) => {
            // Sort by total count
            const totalA = Object.values(a).filter(v => typeof v === 'number').reduce((sum: number, v: any) => sum + v, 0);
            const totalB = Object.values(b).filter(v => typeof v === 'number').reduce((sum: number, v: any) => sum + v, 0);
            return totalB - totalA;
        });
    }, [stats?.cis_by_dept_and_type]);

    // Get all unique keys (CI Types) for the bars
    const ciTypes = React.useMemo(() => {
        const types = new Set<string>();
        ciDeptTypeData.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'name') types.add(key);
            });
        });
        return Array.from(types);
    }, [ciDeptTypeData]);

    const COLORS = ['#F47D30', '#FF9D5C', '#D96B1F', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

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
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard Overview</h1>
                    <p>Configuration Management Database Statistics</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(244, 125, 48, 0.1)' }}>
                        <Server size={24} color="#F47D30" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total CIs</p>
                        <h2 className="stat-value">{stats?.total_cis || 0}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <Activity size={24} color="#10B981" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Active CIs</p>
                        <h2 className="stat-value">{stats?.active_cis || 0}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <TrendingUp size={24} color="#F59E0B" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Inactive CIs</p>
                        <h2 className="stat-value">{stats?.inactive_cis || 0}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <Upload size={24} color="#3B82F6" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Recent Imports</p>
                        <h2 className="stat-value">{stats?.recent_imports || 0}</h2>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="card chart-card">
                    <h3>CIs by Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={ciTypeData}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const typeName = data.activePayload[0].payload.name.toLowerCase().replace(' ', '_');
                                    navigate(`/cis?ci_type=${typeName}`);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <XAxis dataKey="name" stroke="#B0B2B8" />
                            <YAxis stroke="#B0B2B8" />
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="value" fill="#F47D30" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>CIs by Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={ciStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                onClick={(data) => {
                                    if (data && data.name) {
                                        navigate(`/cis?status=${data.name.toLowerCase()}`);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {ciStatusData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>CIs by Department</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={ciDepartmentData}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const deptName = data.activePayload[0].payload.name;
                                    navigate(`/cis?department=${deptName}`);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <XAxis dataKey="name" stroke="#B0B2B8" />
                            <YAxis stroke="#B0B2B8" />
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3>CIs by Department and Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={ciDeptTypeData}
                            style={{ cursor: 'pointer' }}
                        >
                            <XAxis dataKey="name" stroke="#B0B2B8" />
                            <YAxis stroke="#B0B2B8" />
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                                cursor={{ fill: 'transparent' }}
                            />
                            {/* Legend would be nice here */}
                            {/* Legend would be nice here */}
                            {ciTypes.map((type, index) => (
                                <Bar
                                    key={type}
                                    dataKey={type}
                                    stackId="a"
                                    fill={COLORS[index % COLORS.length]}
                                    radius={index === ciTypes.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>CIs by Location</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={ciLocationData}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const locName = data.activePayload[0].payload.name;
                                    navigate(`/cis?location=${locName}`);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <XAxis dataKey="name" stroke="#B0B2B8" />
                            <YAxis stroke="#B0B2B8" />
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3>Monthly Costs by Cost Center</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={costsData}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const ccName = data.activePayload[0].payload.name;
                                    navigate(`/cis?cost_center=${ccName}`);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <XAxis dataKey="name" stroke="#B0B2B8" />
                            <YAxis stroke="#B0B2B8" unit="€" />
                            <Tooltip
                                contentStyle={{
                                    background: '#25262C',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                }}
                                formatter={(value: number) => [`€${value.toFixed(2)}`, 'Monthly Cost']}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card recent-cis-card">
                <h3>Recently Modified CIs</h3>
                <div className="recent-cis-list">
                    {recentCIs && recentCIs.length > 0 ? (
                        recentCIs.map((ci: any) => (
                            <div key={ci.id} className="recent-ci-item">
                                <div className="ci-info">
                                    <h4>{ci.name}</h4>
                                    <p>{ci.ci_type.replace('_', ' ')}</p>
                                </div>
                                <span className={`badge badge-${getStatusColor(ci.status)}`}>
                                    {ci.status}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="empty-state">No recent configuration items</p>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
