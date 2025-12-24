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
    onChange: (mapping: Record<string, string>) => void;
    sourceFields?: string[];  // Optional list of available source fields
}

const CMDB_FIELDS = [
    { value: 'name', label: 'Name *', required: true },
    { value: 'ci_type', label: 'CI Type', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'description', label: 'Description', required: false },
    { value: 'department', label: 'Abteilung', required: false },
    { value: 'location', label: 'Location', required: false },
    { value: 'environment', label: 'Environment', required: false },
    { value: 'operating_system', label: 'Operating System', required: false },
    { value: 'cost_center', label: 'Cost Center', required: false },
    { value: 'sla', label: 'SLA', required: false },
    { value: 'technical_details', label: 'Technical Details (JSON)', required: false },
    { value: 'domain', label: 'Domain', required: false }
];

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({ mapping, onChange, sourceFields }) => {
    // Initialize state from props
    const [mappings, setMappings] = useState<FieldMapping[]>(() => {
        return Object.entries(mapping).map(([cmdbField, sourceField]) => {
            const isStatic = sourceField.startsWith('STATIC:');
            return {
                cmdbField,
                sourceField: isStatic ? sourceField.substring(7) : sourceField,
                isStatic
            };
        });
    });

    // Update parent when mappings change
    const updateParent = (newMappings: FieldMapping[]) => {
        const mappingObj: Record<string, string> = {};
        newMappings.forEach(m => {
            if (m.cmdbField && m.sourceField) {
                mappingObj[m.cmdbField] = m.isStatic ? `STATIC:${m.sourceField}` : m.sourceField;
            }
        });
        onChange(mappingObj);
    };

    const handleAddMapping = () => {
        const newMappings = [...mappings, { cmdbField: '', sourceField: '', isStatic: false }];
        setMappings(newMappings);
        // Don't update parent yet, wait for valid input
    };

    const handleRemoveMapping = (index: number) => {
        const newMappings = mappings.filter((_, i) => i !== index);
        setMappings(newMappings);
        updateParent(newMappings);
    };

    const handleMappingChange = (index: number, field: keyof FieldMapping, value: any) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setMappings(newMappings);
        updateParent(newMappings);
    };

    const toggleStatic = (index: number) => {
        const newMappings = [...mappings];
        newMappings[index].isStatic = !newMappings[index].isStatic;
        // Clear value when switching modes to avoid confusion
        newMappings[index].sourceField = '';
        setMappings(newMappings);
        updateParent(newMappings);
    };

    return (
        <div className="field-mapping-editor">
            <div className="mapping-header">
                <h3>Field Mapping</h3>
                <p className="help-text">Map source fields to CMDB properties. Toggle "Static" to set a fixed value (e.g., "Server").</p>
            </div>

            <div className="mapping-table">
                <div className="mapping-table-header">
                    <div className="header-cell">CMDB Field</div>
                    <div className="header-cell" style={{ flex: 0.2 }}>Type</div>
                    <div className="header-cell">Source Field / Value</div>
                    <div className="header-cell-actions">Actions</div>
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
                        No field mappings defined. Click "Add Mapping" to get started.
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleAddMapping}
                className="add-mapping-btn"
            >
                <Plus size={16} />
                Add Mapping
            </button>
        </div>
    );
};

export default FieldMappingEditor;
