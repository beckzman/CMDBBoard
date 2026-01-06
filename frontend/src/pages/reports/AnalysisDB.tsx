
import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';
import { dashboardAPI, DashboardStats } from '../../api/client';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnalysisDB: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await dashboardAPI.getStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    const totalItems = stats?.cis_by_db_detailed?.reduce((acc, curr) => acc + curr.value, 0) || 0;

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/analysis')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>Database Lifecycle Analysis</h1>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={stats?.cis_by_db_detailed || []}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
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
                            {stats?.cis_by_db_detailed?.map((entry, index) => (
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
            </div>

            <div className="analysis-summary">
                <p>Tracking <strong>{totalItems}</strong> Active Databases across {stats?.cis_by_db_detailed?.length || 0} versions.</p>
            </div>
        </div>
    );
};

export default AnalysisDB;
