import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributeAPI, importAPI } from '../api/client';
import { Save, Plus, AlertCircle } from 'lucide-react';

interface Attribute {
    id: number;
    name: number;
    label: string;
    data_type: string;
    is_custom: boolean;
    description?: string;
    import_source_id: number | null;
}

interface ImportSource {
    id: number;
    name: string;
    source_type: string;
}

const AttributeSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Attributes
    const { data: attributes, isLoading: loadingAttrs } = useQuery({
        queryKey: ['attributes'],
        queryFn: attributeAPI.list
    });

    // Fetch Sources (for dropdown)
    const { data: sources, isLoading: loadingSources } = useQuery({
        queryKey: ['importSources'],
        queryFn: importAPI.listSources
    });

    // Update Mapping Mutation
    const updateMutation = useMutation({
        mutationFn: (data: { attrId: number, sourceId: number | null }) =>
            attributeAPI.updateMapping(data.attrId, data.sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attributes'] });
        }
    });

    const handleOwnerChange = (attrId: number, value: string) => {
        const sourceId = value === 'manual' ? null : parseInt(value);
        updateMutation.mutate({ attrId, sourceId });
    };

    const filteredAttributes = attributes?.filter((attr: Attribute) =>
        attr.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attr.name.toString().toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (loadingAttrs || loadingSources) return <div className="p-8 text-white">Loading settings...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Data Governance / SSoT</h1>
                    <p className="text-gray-400">Define which Import Source is the "Single Source of Truth" for each attribute.</p>
                </div>
                {/* Future: Add 'Create Custom Attribute' button here */}
            </div>

            {/* Toolbar */}
            <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                <input
                    type="text"
                    placeholder="Search attributes..."
                    className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900 text-gray-200 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Attribute Name</th>
                            <th className="px-6 py-4">Internal Field</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Owner (Source of Truth)</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredAttributes.map((attr: Attribute) => (
                            <tr key={attr.id} className="hover:bg-gray-750 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {attr.label}
                                    {attr.is_custom && <span className="ml-2 px-2 py-0.5 text-xs bg-blue-900 text-blue-200 rounded">Custom</span>}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">{attr.name}</td>
                                <td className="px-6 py-4">{attr.data_type}</td>
                                <td className="px-6 py-4">
                                    <select
                                        className="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                        value={attr.import_source_id?.toString() || 'manual'}
                                        onChange={(e) => handleOwnerChange(attr.id, e.target.value)}
                                    >
                                        <option value="manual">Manual / User Input</option>
                                        <optgroup label="Import Sources">
                                            {sources?.map((source: ImportSource) => (
                                                <option key={source.id} value={source.id}>
                                                    {source.name} ({source.source_type})
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    {attr.import_source_id ?
                                        <span className="text-green-400 flex items-center gap-1">Managed</span> :
                                        <span className="text-yellow-500 flex items-center gap-1">Manual</span>
                                    }
                                </td>
                            </tr>
                        ))}
                        {filteredAttributes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No attributes found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttributeSettings;
