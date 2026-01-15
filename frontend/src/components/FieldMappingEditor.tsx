import React, { useState } from 'react';
import { Plus, Trash2, Type, Database } from 'lucide-react';
import './FieldMappingEditor.css';

interface FieldMapping {
    cmdbField: string;
    sourceField: string;
    isStatic: boolean;
}

interface FieldMappingEditorProps {
    mapping: Record<string, string>;
    relationshipMapping?: any[];
    onChange: (mapping: Record<string, string>, relationshipMapping?: any[]) => void;
    sourceFields?: string[];  // Optional list of available source fields
}

interface RelMapping {
    sourceColumn: string;
    relationshipType: string;
    separator: string;
}

const RELATIONSHIP_TYPES = [
    { value: 'runs_on', label: 'Runs On' },
    { value: 'depends_on', label: 'Depends On' },
    { value: 'connected_to', label: 'Connected To' },
    { value: 'managed_by', label: 'Managed By' }
];

const CMDB_FIELDS = [
    { value: 'name', label: 'Name *', required: true },
    { value: 'ci_type', label: 'CI Type', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'description', label: 'Description', required: false },
    { value: 'department', label: 'Abteilung', required: false },
    { value: 'location', label: 'Location', required: false },
    { value: 'environment', label: 'Environment', required: false },
    { value: 'os_db_system', label: 'OS/DB System', required: false },
    { value: 'cost_center', label: 'Cost Center', required: false },
    { value: 'service_provider', label: 'Service Provider', required: false },
    { value: 'contact', label: 'Contact', required: false },
    { value: 'sla', label: 'SLA', required: false },
    { value: 'technical_details', label: 'Technical Details (JSON)', required: false },
    { value: 'domain', label: 'Domain', required: false }
];

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({ mapping, relationshipMapping, onChange, sourceFields }) => {
    // Initialize state from props
    const [mappings, setMappings] = useState<FieldMapping[]>(() => {
        if (!mapping) return [];
        return Object.entries(mapping).map(([cmdbField, sourceField]) => {
            const isStatic = sourceField.startsWith('STATIC:');
            return {
                cmdbField,
                sourceField: isStatic ? sourceField.substring(7) : sourceField,
                isStatic
            };
        });
    });

    const [relMappings, setRelMappings] = useState<RelMapping[]>(() => {
        return (Array.isArray(relationshipMapping) ? relationshipMapping : []).map((m: any) => ({
            sourceColumn: m.source_column || '',
            relationshipType: m.relationship_type || 'runs_on',
            separator: m.separator || ','
        }));
    });

    // Unified parent updater
    const updateParent = (currentMappings: FieldMapping[], currentRelMappings: RelMapping[]) => {
        const mappingObj: Record<string, string> = {};
        currentMappings.forEach(m => {
            if (m.cmdbField && m.sourceField) {
                mappingObj[m.cmdbField] = m.isStatic ? `STATIC:${m.sourceField}` : m.sourceField;
            }
        });

        const mappedForBackend = currentRelMappings.map(m => ({
            source_column: m.sourceColumn,
            relationship_type: m.relationshipType,
            separator: m.separator
        }));

        onChange(mappingObj, mappedForBackend);
    };

    const handleAddMapping = () => {
        const newMappings = [...mappings, { cmdbField: '', sourceField: '', isStatic: false }];
        setMappings(newMappings);
        // Don't update parent yet, wait for valid input
    };

    const handleRemoveMapping = (index: number) => {
        const newMappings = mappings.filter((_, i) => i !== index);
        setMappings(newMappings);
        updateParent(newMappings, relMappings);
    };

    const handleMappingChange = (index: number, field: keyof FieldMapping, value: any) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setMappings(newMappings);
        updateParent(newMappings, relMappings);
    };

    const toggleStatic = (index: number) => {
        const newMappings = [...mappings];
        newMappings[index].isStatic = !newMappings[index].isStatic;
        newMappings[index].sourceField = '';
        setMappings(newMappings);
        updateParent(newMappings, relMappings);
    };

    const handleAddRelMapping = () => {
        const newRels = [...relMappings, { sourceColumn: '', relationshipType: 'runs_on', separator: ',' }];
        setRelMappings(newRels);
    };

    const handleRemoveRelMapping = (index: number) => {
        const newRels = relMappings.filter((_, i) => i !== index);
        setRelMappings(newRels);
        updateParent(mappings, newRels);
    };

    const handleRelChange = (index: number, field: keyof RelMapping, value: string) => {
        const newRels = [...relMappings];
        newRels[index] = { ...newRels[index], [field]: value };
        setRelMappings(newRels);
        updateParent(mappings, newRels);
    };

    return (
        <div className="field-mapping-editor">
            {/* Standard Field Mappings */}
            <div className="mapping-header">
                <h3>Attribute Mapping</h3>
                <p className="help-text">Map source fields to CMDB properties.</p>
            </div>

            <div className="mapping-table">
                <div className="mapping-table-header">
                    <div className="header-cell">CMDB Field</div>
                    <div className="header-cell" style={{ flex: 0.2 }}>Type</div>
                    <div className="header-cell">Source Field / Value</div>
                    <div className="header-cell-actions"></div>
                </div>

                {mappings.map((mapping, index) => (
                    <div key={index} className="mapping-row">
                        <div className="mapping-cell">
                            <select
                                value={mapping.cmdbField}
                                onChange={(e) => handleMappingChange(index, 'cmdbField', e.target.value)}
                                className="mapping-select"
                            >
                                <option value="">Select CMDB field...</option>
                                {CMDB_FIELDS.map(field => (
                                    <option key={field.value} value={field.value}>
                                        {field.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mapping-cell" style={{ flex: 0.2, justifyContent: 'center' }}>
                            <button
                                type="button"
                                className={`mode-toggle-btn ${mapping.isStatic ? 'static' : 'dynamic'}`}
                                onClick={() => toggleStatic(index)}
                                title={mapping.isStatic ? "Switch to Source Field" : "Switch to Static Value"}
                            >
                                {mapping.isStatic ? <Type size={16} /> : <Database size={16} />}
                            </button>
                        </div>
                        <div className="mapping-cell">
                            {mapping.isStatic ? (
                                <input
                                    type="text"
                                    value={mapping.sourceField}
                                    onChange={(e) => handleMappingChange(index, 'sourceField', e.target.value)}
                                    placeholder="Enter static value..."
                                    className="mapping-input static-input"
                                />
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        list={`source-fields-${index}`}
                                        value={mapping.sourceField}
                                        onChange={(e) => handleMappingChange(index, 'sourceField', e.target.value)}
                                        placeholder={sourceFields && sourceFields.length > 0 ? "Select or type field name" : "e.g., Title or Owner.Email"}
                                        className="mapping-input"
                                    />
                                    {sourceFields && sourceFields.length > 0 && (
                                        <datalist id={`source-fields-${index}`}>
                                            {sourceFields.map(field => (
                                                <option key={field} value={field} />
                                            ))}
                                        </datalist>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="mapping-cell-actions">
                            <button
                                type="button"
                                onClick={() => handleRemoveMapping(index)}
                                className="remove-btn"
                                title="Remove mapping"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {mappings.length === 0 && (
                    <div className="empty-mappings">
                        No attribute mappings.
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleAddMapping}
                className="add-mapping-btn"
                style={{ marginBottom: '2rem' }}
            >
                <Plus size={16} />
                Add Attribute Mapping
            </button>


            {/* Relationship Mappings Section */}
            <div className="mapping-header" style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                <h3>Relationship Mapping</h3>
                <p className="help-text">Create relationships based on column values (e.g., "Parent Server" column &rarr; "Runs On" relation).</p>
            </div>

            <div className="mapping-table">
                <div className="mapping-table-header">
                    <div className="header-cell">Source Column</div>
                    <div className="header-cell">Relationship Type</div>
                    <div className="header-cell" style={{ flex: 0.3 }}>Separator</div>
                    <div className="header-cell-actions"></div>
                </div>

                {relMappings.map((rel, index) => (
                    <div key={index} className="mapping-row">
                        <div className="mapping-cell">
                            <input
                                type="text"
                                list={`rel-source-fields-${index}`}
                                value={rel.sourceColumn}
                                onChange={(e) => handleRelChange(index, 'sourceColumn', e.target.value)}
                                placeholder="Source Column"
                                className="mapping-input"
                            />
                            {sourceFields && sourceFields.length > 0 && (
                                <datalist id={`rel-source-fields-${index}`}>
                                    {sourceFields.map(field => (
                                        <option key={field} value={field} />
                                    ))}
                                </datalist>
                            )}
                        </div>
                        <div className="mapping-cell">
                            <select
                                value={rel.relationshipType}
                                onChange={(e) => handleRelChange(index, 'relationshipType', e.target.value)}
                                className="mapping-select"
                            >
                                {RELATIONSHIP_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mapping-cell" style={{ flex: 0.3 }}>
                            <input
                                type="text"
                                value={rel.separator}
                                onChange={(e) => handleRelChange(index, 'separator', e.target.value)}
                                placeholder=","
                                className="mapping-input"
                                style={{ textAlign: 'center' }}
                            />
                        </div>
                        <div className="mapping-cell-actions">
                            <button
                                type="button"
                                onClick={() => handleRemoveRelMapping(index)}
                                className="remove-btn"
                                title="Remove relationship mapping"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {relMappings.length === 0 && (
                    <div className="empty-mappings">
                        No relationship mappings defined.
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleAddRelMapping}
                className="add-mapping-btn"
            >
                <Plus size={16} />
                Add Relationship Mapping
            </button>

        </div>
    );
};

export default FieldMappingEditor;
