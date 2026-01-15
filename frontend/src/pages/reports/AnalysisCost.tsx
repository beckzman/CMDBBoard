
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


    // Prepare data for Stacked Bar Chart
    const data = stats ? Object.entries(stats.costs_by_cost_center_and_type || {})
        .map(([name, types]) => {
            const row: any = { name, total: 0 };
            Object.entries(types).forEach(([type, cost]) => {
                row[type] = cost;
                row.total += cost;
            });
            return row;
        })
        .sort((a, b) => b.total - a.total) : [];

    // Get all unique CI types for the chart keys (excluding 'name' and 'total')
    const allTypes = Array.from(new Set(
        data.flatMap(item => Object.keys(item).filter(k => k !== 'name' && k !== 'total'))
    ));

    // Colors for different types
    const colors = [
        '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#64748B'
    ];

    // Generate Summary Text
    const totalCost = data.reduce((sum, item) => sum + item.total, 0);
    const topCostCenter = data.length > 0 ? data[0] : null;

    // Calculate global breakdown by type
    const globalTypeCosts: Record<string, number> = {};
    data.forEach(item => {
        allTypes.forEach(type => {
            if (item[type]) {
                globalTypeCosts[type] = (globalTypeCosts[type] || 0) + item[type];
            }
        });
    });

    const topType = Object.entries(globalTypeCosts)
        .sort(([, a], [, b]) => b - a)[0];

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
                    <BarChart
                        data={data}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                const name = data.activePayload[0].payload.name;
                                navigate(`/cis?cost_center=${name}`);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                            formatter={(value: number) => `€${value.toLocaleString()}`}
                            itemSorter={(item) => (item.value as number) * -1}
                        />
                        <Legend />
                        {allTypes.map((type, index) => (
                            <Bar
                                key={type}
                                dataKey={type}
                                stackId="a"
                                fill={colors[index % colors.length]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="analysis-text-section" style={{
                padding: '2rem',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '0.5rem',
                margin: '2rem 0',
                border: '1px solid var(--border-color)'
            }}>
                <h3 style={{ marginTop: 0 }}>Analysis Summary</h3>
                <p>
                    Total projected monthly cost across all cost centers is <strong>€{totalCost.toLocaleString()}</strong>.
                </p>
                {topCostCenter && (
                    <p>
                        The primary cost driver is <strong>{topCostCenter.name}</strong> with a total of
                        <strong> €{topCostCenter.total.toLocaleString()}</strong>
                        ({((topCostCenter.total / totalCost) * 100).toFixed(1)}% of total).
                    </p>
                )}
                {topType && (
                    <p>
                        <strong>{topType[0]}</strong> infrastructure represents the largest category of spend globally,
                        accounting for €{topType[1].toLocaleString()}.
                    </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginTop: '1rem' }}>
                    * Costs are calculated based on active configuration items and defined cost allocation rules.
                    Breakdown by type (Server, Database, etc.) helps identify specific infrastructure optimizaton opportunities.
                </p>
            </div>

            <div className="data-table-section">
                <h2>Details</h2>
                <table className="analysis-table">
                    <thead>
                        <tr>
                            <th>Cost Center</th>
                            {allTypes.map(type => <th key={type}>{type}</th>)}
                            <th>Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.name}>
                                <td>{item.name}</td>
                                {allTypes.map(type => (
                                    <td key={type}>€{(item[type] || 0).toLocaleString()}</td>
                                ))}
                                <td><strong>€{item.total.toLocaleString()}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalysisCost;
