export const sampleData = [
    {
        "Name": "Indeed",
        "Type": "Resource",
        "Execution": "Automatic",
        "Ø Cost": 0.3,
        "Effective Cost": 120.0,
        "Monitoring": "Team Tailor",
        "Platform": "Indeed",
        "Incoming": "",
        "Outgoing": "Text Application"
    },
    {
        "Name": "Text Application",
        "Type": "Action",
        "Execution": "Applicant",
        "Ø Cost": 0.2,
        "Effective Cost": 80.0,
        "Monitoring": "Team Tailor",
        "Platform": "TypeForm",
        "Incoming": "Indeed",
        "Outgoing": "Video Application"
    },
    {
        "Name": "AI Call",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.4,
        "Effective Cost": 40.0,
        "Monitoring": "Team Tailor",
        "Platform": "Solers",
        "Incoming": "Pre Call SMS",
        "Outgoing": "Pre Video Mail"
    },
    {
        "Name": "Application Review 1",
        "Type": "Decision",
        "Execution": "Noemie",
        "Ø Cost": 0.1,
        "Effective Cost": 4.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Video Application",
        "Outgoing": "Rejection 1,Application Review 2"
    },
    {
        "Name": "Ghost 1",
        "Type": "State",
        "Execution": "Applicant",
        "Ø Cost": null,
        "Effective Cost": null,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Video Application",
        "Outgoing": ""
    },
    {
        "Name": "Pre Call SMS",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.1,
        "Effective Cost": 10.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Text Application",
        "Outgoing": "AI Call"
    },
    {
        "Name": "Pre Video Mail",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.05,
        "Effective Cost": 5.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "AI Call",
        "Outgoing": "Video Application"
    },
    {
        "Name": "Video Application",
        "Type": "Action",
        "Execution": "Applicant",
        "Ø Cost": 0.1,
        "Effective Cost": 40.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Pre Video Mail",
        "Outgoing": "Application Review 1,Ghost 1"
    },
    {
        "Name": "Rejection 1",
        "Type": "State",
        "Execution": "Automatic",
        "Ø Cost": 0.1,
        "Effective Cost": 2.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Application Review 1",
        "Outgoing": ""
    },
    {
        "Name": "Application Review 2",
        "Type": "Decision",
        "Execution": "Manual",
        "Ø Cost": 1.0,
        "Effective Cost": 50.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Application Review 1",
        "Outgoing": ""
    }
];