
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../api/client';
import {
    DollarSign,
    TrendingUp,
    Monitor,
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

    const getOSData = () => {
        if (!stats?.cis_by_os_db_system) return [];
        return Object.entries(stats.cis_by_os_db_system)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Start with top 5
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
                    <BarChart data={getCostData()}>
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
            id: 'os',
            title: 'OS/DB System Usage',
            description: 'Distribution of operating systems and databases across your fleet.',
            icon: Monitor,
            path: '/analysis/os',
            color: '#F59E0B',
            chart: (
                <ResponsiveContainer width="100%" height={60}>
                    <PieChart>
                        <Pie
                            data={getOSData()}
                            cx="50%"
                            innerRadius={15}
                            outerRadius={25}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {
                                getOSData().map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))
                            }
                        </Pie >
                    </PieChart >
                </ResponsiveContainer >
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
                    <BarChart data={getSLAData()}>
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
                        onClick={() => navigate(report.path)}
                    >
                        <div className="report-icon-wrapper" style={{ backgroundColor: `${report.color}20` }}>
                            <report.icon size={24} color={report.color} />
                        </div>
                        <div className="report-content">
                            <h3>{report.title}</h3>
                            <p>{report.description}</p>
                            <div className="report-preview">
                                {report.chart}
                            </div>
                        </div>
                        <div className="report-action">
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
