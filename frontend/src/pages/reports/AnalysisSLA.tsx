
import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../../api/client';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisSLA: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await dashboardAPI.getStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    const data = stats ? Object.entries(stats.cis_by_sla)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) : [];

    const getColor = (sla: string) => {
        const lower = sla.toLowerCase();
        if (lower.includes('gold') || lower.includes('platinum') || lower.includes('critical')) return '#ef4444'; // Red for high importance
        if (lower.includes('silver') || lower.includes('high')) return '#f97316';
        if (lower.includes('bronze') || lower.includes('medium')) return '#eab308';
        return '#3b82f6'; // Blue default
    };

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/analysis')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>SLA Compliance</h1>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={data}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                const name = data.activePayload[0].payload.name;
                                navigate(`/cis?sla=${name}`);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="CIs Count">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="data-table-section">
                <h2>Breakdown</h2>
                <table className="analysis-table">
                    <thead>
                        <tr>
                            <th>SLA Level</th>
                            <th>Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.name}>
                                <td>{item.name}</td>
                                <td>{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalysisSLA;
