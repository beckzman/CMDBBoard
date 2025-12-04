import React from 'react';
import './ReconciliationEditor.css';

interface ReconciliationConfig {
    key_field: string;
    match_strategy: string;
    conflict_resolution: Record<string, string>;
}

interface ReconciliationEditorProps {
    config: ReconciliationConfig;
    onChange: (config: ReconciliationConfig) => void;
    mappedFields: string[];
}

const MATCH_STRATEGIES = [
    { value: 'exact', label: 'Exact Match' },
    { value: 'case_insensitive', label: 'Case Insensitive' },
    { value: 'fuzzy', label: 'Fuzzy Match' }
];

const RESOLUTION_STRATEGIES = [
    { value: 'source', label: 'Use Source Data (Overwrite)' },
    { value: 'existing', label: 'Keep Existing Data' },
    { value: 'merge', label: 'Merge (Not Implemented)' }
];

const ReconciliationEditor: React.FC<ReconciliationEditorProps> = ({ config, onChange, mappedFields }) => {
    const handleKeyFieldChange = (value: string) => {
        onChange({ ...config, key_field: value });
    };

    const handleStrategyChange = (value: string) => {
        onChange({ ...config, match_strategy: value });
    };

    const handleResolutionChange = (field: string, strategy: string) => {
        onChange({
            ...config,
            conflict_resolution: {
                ...config.conflict_resolution,
                [field]: strategy
            }
        });
    };

    return (
        <div className="reconciliation-editor">
            <div className="recon-section">
                <h3>Reconciliation Settings</h3>
                <p className="help-text">Configure how to match and merge imported data with existing CIs.</p>

                <div className="form-group">
                    <label>Reconciliation Key Field</label>
                    <select
                        value={config.key_field}
                        onChange={(e) => handleKeyFieldChange(e.target.value)}
                        className="recon-select"
                    >
                        <option value="name">Name</option>
                        <option value="domain">Domain</option>
                        <option value="external_id">External ID</option>
                    </select>
                    <p className="field-help">Field used to match imported records with existing CIs</p>
                </div>

                <div className="form-group">
                    <label>Match Strategy</label>
                    <select
                        value={config.match_strategy}
                        onChange={(e) => handleStrategyChange(e.target.value)}
                        className="recon-select"
                    >
                        {MATCH_STRATEGIES.map(strategy => (
                            <option key={strategy.value} value={strategy.value}>
                                {strategy.label}
                            </option>
                        ))}
                    </select>
                    <p className="field-help">How to compare values when matching</p>
                </div>
            </div>

            <div className="recon-section">
                <h3>Conflict Resolution</h3>
                <p className="help-text">Define which data source takes priority when updating existing CIs.</p>

                <div className="conflict-rules">
                    {mappedFields.filter(f => f !== config.key_field).map(field => (
                        <div key={field} className="conflict-rule">
                            <div className="rule-field">{field}</div>
                            <div className="rule-strategy">
                                <select
                                    value={config.conflict_resolution[field] || 'source'}
                                    onChange={(e) => handleResolutionChange(field, e.target.value)}
                                    className="strategy-select"
                                >
                                    {RESOLUTION_STRATEGIES.map(strategy => (
                                        <option key={strategy.value} value={strategy.value}>
                                            {strategy.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}

                    {mappedFields.length === 0 && (
                        <div className="empty-rules">
                            No mapped fields available. Please configure field mappings first.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReconciliationEditor;
