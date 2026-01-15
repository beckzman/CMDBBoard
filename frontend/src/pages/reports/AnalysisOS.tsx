
import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid, LabelList
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
                    <BarChart
                        data={stats?.cis_by_os_detailed || []}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                const name = data.activePayload[0].payload.name;
                                navigate(`/cis?software=${encodeURIComponent(name)}`);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" tick={{ fill: '#9ca3af' }} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={180}
                            tick={{ fill: '#e5e7eb', fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Count">
                            <LabelList dataKey="value" position="right" />
                            {stats?.cis_by_os_detailed?.map((entry, index) => (
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
            </div>

            <div className="analysis-summary">
                <p>Tracking <strong>{totalItems}</strong> Active CIs across {data.length} OS/DB categories.</p>
            </div>
        </div>
    );
};

export default AnalysisOS;
