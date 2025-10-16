/**
 * Legend configuration for node and execution categories.
 *
 * Edit this file to rename or regroup legend entries. Each entry maps directly to
 * the shapes rendered in the graph. If an entry references a subtype that isn't
 * currently used in your data, it will still render so you can document categories
 * ahead of time.
 */
export const NODE_LEGEND_GROUPS = [
    {
        id: 'resources',
        title: 'Resources',
        items: [
            { type: 'Resource', label: 'Resource' }
        ]
    },
    {
        id: 'actions',
        title: 'Actions',
        items: [
            { type: 'Action', subType: 'Call Outgoing', label: 'Outgoing' },
            { type: 'Action', subType: 'Form Incoming', label: 'Incoming' },
            { type: 'Action', subType: 'Physical Displacement', label: 'Movement' },
            { type: 'Action', label: 'Administration' }
        ]
    },
    {
        id: 'states',
        title: 'States',
        items: [
            { type: 'State', subType: 'Out', label: 'Out' },
            { type: 'State', label: 'State' }
        ]
    },
    {
        id: 'decisions',
        title: 'Decisions',
        items: [
            { type: 'Decision', subType: 'Automatic Verification', label: 'Decision' },
        ]
    }
];

export const EXECUTION_LEGEND_ITEMS = [
    { execution: 'Automatic', label: 'Automatic' },
    { execution: 'Applicant', label: 'Applicant' },
    { execution: 'Manual/Others', label: 'Manual / Others', borderStyle: '5,5' }
];
