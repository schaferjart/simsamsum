// --- DYNAMIC FILTER/STYLE CONSTANTS ---
export const NODE_COLUMNS = [
    // Core properties
    { id: 'Name', name: 'Name', type: 'text' },
    { id: 'Type', name: 'Type', type: 'text' },
    { id: 'SubType', name: 'Sub Type', type: 'text' },
    { id: 'Execution', name: 'Execution', type: 'text' },
    { id: 'Platform', name: 'Platform', type: 'text' },
    { id: 'Description', name: 'Description', type: 'text' },

    // Organizational properties
    { id: 'AOR', name: 'Area of Responsibility', type: 'text' },
    { id: 'Account', name: 'Account', type: 'text' },
    { id: 'Monitoring', name: 'Monitoring', type: 'text' },
    { id: 'MonitoredData', name: 'Monitored Data', type: 'text' },
    { id: 'KPI', name: 'KPI', type: 'text' },

    // Cost and volume properties
    { id: 'AvgCost', name: 'Average Cost', type: 'number' },
    { id: 'costValue', name: 'Cost Value', type: 'number' },
    { id: 'Effective Cost', name: 'Effective Cost', type: 'number' },
    { id: 'incomingVolume', name: 'Incoming Volume', type: 'number' },
    { id: 'IncomingNumber', name: 'Incoming Number', type: 'number' },
    { id: 'computedIncomingNumber', name: 'Incoming (calculated)', type: 'number' },
    { id: 'Variable', name: 'Variable', type: 'number' },

    // Time and scheduling properties
    { id: 'AvgCostTime', name: 'Average Cost Time', type: 'number' },
    { id: 'LastUpdate', name: 'Last Update', type: 'text' },
    { id: 'NextUpdate', name: 'Next Update', type: 'text' },
    { id: 'ScheduleStart', name: 'Schedule Start', type: 'text' },
    { id: 'ScheduleEnd', name: 'Schedule End', type: 'text' },
    { id: 'Frequency', name: 'Frequency', type: 'text' }
];

export const CONNECTION_COLUMNS = [
    // Direct connection properties
    { id: 'source', name: 'Source ID', type: 'text' },
    { id: 'target', name: 'Target ID', type: 'text' },
    { id: 'type', name: 'Connection Type', type: 'text' },
    { id: 'probability', name: 'Probability', type: 'number' },
    { id: 'time', name: 'Time', type: 'text' },
    { id: 'condition', name: 'Condition', type: 'text' },
    { id: 'execution', name: 'Execution', type: 'text' },
    { id: 'AOR', name: 'Area of Responsibility', type: 'text' },
    { id: 'description', name: 'Description', type: 'text' },

    // Source node properties
    { id: 'source.Name', name: 'Source Name', type: 'text' },
    { id: 'source.Type', name: 'Source Type', type: 'text' },
    { id: 'source.SubType', name: 'Source Sub Type', type: 'text' },
    { id: 'source.Execution', name: 'Source Execution', type: 'text' },
    { id: 'source.Platform', name: 'Source Platform', type: 'text' },
    { id: 'source.AOR', name: 'Source Area of Responsibility', type: 'text' },
    { id: 'source.Account', name: 'Source Account', type: 'text' },
    { id: 'source.Monitoring', name: 'Source Monitoring', type: 'text' },

    // Target node properties
    { id: 'target.Name', name: 'Target Name', type: 'text' },
    { id: 'target.Type', name: 'Target Type', type: 'text' },
    { id: 'target.SubType', name: 'Target Sub Type', type: 'text' },
    { id: 'target.Execution', name: 'Target Execution', type: 'text' },
    { id: 'target.Platform', name: 'Target Platform', type: 'text' },
    { id: 'target.AOR', name: 'Target Area of Responsibility', type: 'text' },
    { id: 'target.Account', name: 'Target Account', type: 'text' },
    { id: 'target.Monitoring', name: 'Target Monitoring', type: 'text' },
];

export const OPERATORS = {
    text: [
        { id: 'contains', name: 'contains' },
        { id: 'not_contains', name: 'does not contain' },
        { id: 'equals', name: 'equals' },
        { id: 'not_equals', name: 'does not equal' },
    ],
    number: [
        { id: 'gt', name: '>' },
        { id: 'lt', name: '<' },
        { id: 'between', name: 'between' },
        { id: 'eq', name: '=' },
    ]
};