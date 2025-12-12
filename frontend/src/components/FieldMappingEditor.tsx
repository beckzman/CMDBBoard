import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import './FieldMappingEditor.css';

interface FieldMapping {
    cmdbField: string;
    sourceField: string;
}

interface FieldMappingEditorProps {
    mapping: Record<string, string>;
    onChange: (mapping: Record<string, string>) => void;
    sourceFields?: string[];  // Optional list of available source fields
}

const CMDB_FIELDS = [
    { value: 'name', label: 'Name *', required: true },
    { value: 'ci_type', label: 'CI Type', required: false },
    { value: 'description', label: 'Description', required: false },
    { value: 'owner', label: 'Owner', required: false },
    { value: 'location', label: 'Location', required: false },
    { value: 'environment', label: 'Environment', required: false },
    { value: 'cost_center', label: 'Cost Center', required: false },
    { value: 'technical_details', label: 'Technical Details', required: false },
    { value: 'domain', label: 'Domain', required: false }
];

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({ mapping, onChange, sourceFields }) => {
    const [mappings, setMappings] = useState<FieldMapping[]>(() => {
        return Object.entries(mapping).map(([cmdbField, sourceField]) => ({
            cmdbField,
            sourceField
        }));
    });

    const handleAddMapping = () => {
        const newMappings = [...mappings, { cmdbField: '', sourceField: '' }];
        setMappings(newMappings);
    };

    const handleRemoveMapping = (index: number) => {
        const newMappings = mappings.filter((_, i) => i !== index);
        setMappings(newMappings);
        updateParent(newMappings);
    };

    const handleMappingChange = (index: number, field: 'cmdbField' | 'sourceField', value: string) => {
        const newMappings = [...mappings];
        newMappings[index][field] = value;
        setMappings(newMappings);
        updateParent(newMappings);
    };

    const updateParent = (newMappings: FieldMapping[]) => {
        const mappingObj: Record<string, string> = {};
        newMappings.forEach(m => {
            if (m.cmdbField && m.sourceField) {
                mappingObj[m.cmdbField] = m.sourceField;
            }
        });
        onChange(mappingObj);
    };

    return (
        <div className="field-mapping-editor">
            <div className="mapping-header">
                <h3>Field Mapping</h3>
                <p className="help-text">Map external source fields to CMDB fields. Use dot notation for nested fields (e.g., "Owner.Email").</p>
            </div>

            <div className="mapping-table">
                <div className="mapping-table-header">
                    <div className="header-cell">CMDB Field</div>
                    <div className="header-cell">Source Field</div>
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
                        <div className="mapping-cell">
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
