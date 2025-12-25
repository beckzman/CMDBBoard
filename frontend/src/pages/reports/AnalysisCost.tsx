
import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../../api/client';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisCost: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await dashboardAPI.getStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    const data = stats ? Object.entries(stats.costs_by_cost_center)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) : [];

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/analysis')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>Cost Distribution</h1>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="value" fill="#10B981" name="Cost (€)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="data-table-section">
                <h2>Details</h2>
                <table className="analysis-table">
                    <thead>
                        <tr>
                            <th>Cost Center</th>
                            <th>Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.name}>
                                <td>{item.name}</td>
                                <td>€{item.value.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalysisCost;
