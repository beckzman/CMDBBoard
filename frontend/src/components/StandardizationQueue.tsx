import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { softwareAPI } from '../api/client';
import { AlertCircle, Check, Search, Cpu } from 'lucide-react';
import { SoftwareItem, UnmatchedItem } from '../pages/SoftwareCatalog';

interface StandardizationQueueProps {
    unmatchedItems: UnmatchedItem[];
    catalogItems: SoftwareItem[];
    isLoading: boolean;
    onCreateNew: (name: string) => void;
}

const StandardizationQueue: React.FC<StandardizationQueueProps> = ({
    unmatchedItems,
    catalogItems,
    isLoading,
    onCreateNew
}) => {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('');
    const [justMatched, setJustMatched] = useState<string | null>(null);

    const matchMutation = useMutation({
        mutationFn: softwareAPI.match,
        onSuccess: (_data, variables) => {
            // Show success logic could go here
            setJustMatched(variables.string_to_match);
            setTimeout(() => setJustMatched(null), 3000);

            queryClient.invalidateQueries({ queryKey: ['unmatchedSoftware'] });
            queryClient.invalidateQueries({ queryKey: ['softwareCatalog'] });
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'object' ? JSON.stringify(detail, null, 2) : (detail || error.message);
            alert('Failed to match software: ' + message);
        }
    });

    const handleMatch = (itemString: string, softwareId: string) => {
        if (!softwareId) return;
        matchMutation.mutate({
            software_id: parseInt(softwareId),
            string_to_match: itemString
        });
    };

    const filteredItems = unmatchedItems?.filter(item =>
        item.value.toLowerCase().includes(filter.toLowerCase())
    ) || [];

    // Helper to get category icon based on software selection (if we were showing it)
    // or just generic icons for the queue items.

    if (isLoading) {
        return (
            <div className="p-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-500 rounded-full mb-4"></div>
                <p>Loading discovery queue...</p>
            </div>
        );
    }

    if (!unmatchedItems || unmatchedItems.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <div className="w-16 h-16 bg-green-900 bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                    <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                    All discovered software strings have been standardized or linked to catalog items.
                    Great job maintaining the CMDB!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-900 bg-opacity-20 border border-blue-800 p-3 rounded-lg flex gap-3 text-blue-200">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                    <h3 className="font-semibold text-sm">Discovery Queue ({unmatchedItems.length} items)</h3>
                    <p className="text-xs opacity-80">
                        Map these discovered strings to approved Catalog Items to standardize your CMDB data.
                    </p>
                </div>
            </div>

            <div className="ci-table-container">
                <div style={{ padding: '0 24px 16px 24px' }}>
                    <div className="search-box" style={{ maxWidth: '400px' }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Filter queue..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="ci-table-wrapper">
                    <table className="ci-table">
                        <thead>
                            <tr>
                                <th>Discovered String</th>
                                <th>Occurrences</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="empty-cell">
                                        {filter ? 'No items match your filter.' : 'Queue is empty.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr
                                        key={item.value}
                                        className={justMatched === item.value ? 'bg-green-900/50' : ''}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Cpu size={16} className="text-gray-500" />
                                                <span className="ci-name" title={item.value}>{item.value}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="count-badge">
                                                {item.count}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="relative" style={{ minWidth: '200px', flex: 1 }}>
                                                    <select
                                                        className="w-full bg-gray-900 text-white pl-3 pr-8 py-1.5 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                                                        onChange={(e) => handleMatch(item.value, e.target.value)}
                                                        value=""
                                                        disabled={matchMutation.isPending}
                                                    >
                                                        <option value="" disabled>Map to Existing...</option>
                                                        {catalogItems.map((cat) => (
                                                            <option key={cat.id} value={cat.id}>
                                                                {cat.name} {cat.version ? `(${cat.version})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => onCreateNew(item.value)}
                                                    className="btn btn-secondary text-xs whitespace-nowrap"
                                                    style={{ padding: '6px 12px' }}
                                                >
                                                    Create New
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StandardizationQueue;
