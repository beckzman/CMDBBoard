
import React, { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../../api/client';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisOS: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await dashboardAPI.getStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    const data = stats ? Object.entries(stats.cis_by_os_db_system)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) : [];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const totalItems = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/analysis')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>OS/DB System Distribution</h1>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="analysis-summary">
                <p>Tracking <strong>{totalItems}</strong> Active CIs across {data.length} OS/DB categories.</p>
            </div>
        </div>
    );
};

export default AnalysisOS;
