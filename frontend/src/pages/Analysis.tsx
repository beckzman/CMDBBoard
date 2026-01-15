
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../api/client';
import {
    DollarSign,
    TrendingUp,
    Monitor,
    Database,
    CheckSquare,
    ArrowRight
} from 'lucide-react';
import './Analysis.css';

const Analysis: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dashboardAPI.getStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Transform data for charts
    const getGrowthData = () => {
        if (!stats?.ci_growth) return [];
        return Object.entries(stats.ci_growth).map(([key, value]) => ({ name: key, value }));
    };

    const getSLAData = () => {
        if (!stats?.cis_by_sla) return [];
        return Object.entries(stats.cis_by_sla).map(([name, value]) => ({ name, value }));
    };

    const getCostData = () => {
        if (!stats?.costs_by_cost_center) return [];
        return Object.entries(stats.costs_by_cost_center)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };

    const reports = [
        {
            id: 'cost',
            title: 'Cost Distribution',
            description: 'Analyze IT asset costs by cost center and department.',
            icon: DollarSign,
            path: '/analysis/cost',
            color: '#10B981',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <BarChart
                        data={getCostData()}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                // Stop propagation of the card click event
                                if (data.isTooltipActive) { // Checking if interaction is valid
                                    const name = data.activePayload[0].payload.name;
                                    // Use setTimeout to ensure this runs after event handling and prevent race with card click
                                    setTimeout(() => navigate(`/cis?cost_center=${name}`), 0);
                                }
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Bar dataKey="value" fill="#10B981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )
        },
        {
            id: 'growth',
            title: 'CI Growth',
            description: 'Track the growth of Configuration Items over time.',
            icon: TrendingUp,
            path: '/analysis/growth',
            color: '#3B82F6',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={getGrowthData()}>
                        <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            )
        },
        {
            id: 'os_lifecycle',
            title: 'OS Lifecycle Analysis',
            description: 'Operating System distribution with lifecycle status integration.',
            icon: Monitor,
            path: '/analysis/os',
            color: '#F59E0B',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <BarChart
                        data={stats?.cis_by_os_detailed?.slice(0, 5) || []}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                if (data.isTooltipActive) {
                                    const name = data.activePayload[0].payload.name;
                                    setTimeout(() => navigate(`/cis?software=${encodeURIComponent(name)}`), 0);
                                }
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {stats?.cis_by_os_detailed?.slice(0, 5).map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.status === 'end_of_life' ? '#EF4444' :
                                            entry.status === 'unapproved' ? '#F59E0B' :
                                                '#10B981'
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )
        },
        {
            id: 'db_lifecycle',
            title: 'Database Lifecycle Analysis',
            description: 'Database distribution with lifecycle status integration.',
            icon: Database,
            path: '/analysis/db',
            color: '#8B5CF6',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <BarChart
                        data={stats?.cis_by_db_detailed?.slice(0, 5) || []}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                if (data.isTooltipActive) {
                                    const name = data.activePayload[0].payload.name;
                                    setTimeout(() => navigate(`/cis?software=${encodeURIComponent(name)}`), 0);
                                }
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Tooltip />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {stats?.cis_by_db_detailed?.slice(0, 5).map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.status === 'end_of_life' ? '#EF4444' :
                                            entry.status === 'unapproved' ? '#F59E0B' :
                                                '#8B5CF6'
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )
        },
        {
            id: 'sla',
            title: 'SLA Compliance',
            description: 'Overview of Service Level Agreement levels.',
            icon: CheckSquare,
            path: '/analysis/sla',
            color: '#EC4899',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <BarChart
                        data={getSLAData()}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                if (data.isTooltipActive) {
                                    const name = data.activePayload[0].payload.name;
                                    setTimeout(() => navigate(`/cis?sla=${name}`), 0);
                                }
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Bar dataKey="value" fill="#EC4899" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )
        }
    ];

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className="analysis-page">
            <header className="page-header">
                <h1>Analysis Dashboard</h1>
                <p className="subtitle">Detailed insights into your IT infrastructure.</p>
            </header>

            <div className="reports-grid">
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className="report-card"
                    >
                        <div
                            className="report-icon-wrapper"
                            style={{ backgroundColor: `${report.color}20`, cursor: 'pointer' }}
                            onClick={() => navigate(report.path)}
                        >
                            <report.icon size={24} color={report.color} />
                        </div>
                        <div className="report-content">
                            <h3 onClick={() => navigate(report.path)} style={{ cursor: 'pointer' }}>{report.title}</h3>
                            <p onClick={() => navigate(report.path)} style={{ cursor: 'pointer' }}>{report.description}</p>
                            <div className="report-preview">
                                {report.chart}
                            </div>
                        </div>
                        <div
                            className="report-action"
                            onClick={() => navigate(report.path)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span>View Report</span>
                            <ArrowRight size={16} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Analysis;
