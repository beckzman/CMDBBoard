import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { relationshipAPI } from '../../api/client';
import { Search, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RelationsList: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<string>('source_ci_name');
    const [sortDesc, setSortDesc] = useState(false);

    const { data: relationships, isLoading } = useQuery({
        queryKey: ['relationships', 'detailed'],
        queryFn: relationshipAPI.listDetailed,
    });

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortDesc(!sortDesc);
        } else {
            setSortBy(field);
            setSortDesc(false);
        }
    };

    const sortedAndFilteredData = React.useMemo(() => {
        if (!relationships) return [];

        let filtered = relationships;

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = relationships.filter((r: any) =>
                r.source_ci_name.toLowerCase().includes(searchLower) ||
                r.target_ci_name.toLowerCase().includes(searchLower) ||
                r.relationship_type.toLowerCase().includes(searchLower) ||
                (r.description || '').toLowerCase().includes(searchLower)
            );
        }

        return filtered.sort((a: any, b: any) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];

            if (aVal < bVal) return sortDesc ? 1 : -1;
            if (aVal > bVal) return sortDesc ? -1 : 1;
            return 0;
        });
    }, [relationships, search, sortBy, sortDesc]);


    const renderSortIcon = (field: string) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortDesc ? <ArrowDown size={14} className="sort-icon" /> : <ArrowUp size={14} className="sort-icon" />;
    };

    return (
        <div className="analysis-detail-page">
            <div className="page-header">
                <button onClick={() => navigate('/')} className="back-button">
                    <ChevronLeft /> Back
                </button>
                <h1>CI Relations</h1>
            </div>

            <div className="ci-controls">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search relations..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="data-table-section" style={{ marginTop: '1rem' }}>
                {isLoading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading relationships...</p>
                    </div>
                ) : (
                    <table className="analysis-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('source_ci_name')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Source CI {renderSortIcon('source_ci_name')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('relationship_type')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Relation {renderSortIcon('relationship_type')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('target_ci_name')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Target CI {renderSortIcon('target_ci_name')}
                                    </div>
                                </th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredData.length > 0 ? (
                                sortedAndFilteredData.map((rel: any) => (
                                    <tr key={rel.id}>
                                        <td>
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/cis?search=${encodeURIComponent(rel.source_ci_name)}`)}
                                                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                                            >
                                                {rel.source_ci_name}
                                            </span>
                                        </td>
                                        <td><span className="badge badge-info">{rel.relationship_type}</span></td>
                                        <td>
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/cis?search=${encodeURIComponent(rel.target_ci_name)}`)}
                                                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                                            >
                                                {rel.target_ci_name}
                                            </span>
                                        </td>
                                        <td className="text-muted">{rel.description || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center">No relationships found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RelationsList;
