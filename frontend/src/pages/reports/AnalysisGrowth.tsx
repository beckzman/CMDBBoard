
import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../../api/client';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisGrowth: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await dashboardAPI.getStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    const data = stats ? Object.entries(stats.ci_growth)
        .map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/analysis')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>CI Growth Trend</h1>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="New CIs" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="analysis-summary">
                <p>Total CIs added in the last 12 months: <strong>{data.reduce((acc, curr) => acc + curr.value, 0)}</strong></p>
            </div>
        </div>
    );
};

export default AnalysisGrowth;
