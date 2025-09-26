# Workflow Visualizer

**Workflow Visualizer** is an interactive web application for creating, analyzing, and visualizing business workflows and process flows. Built with D3.js, it provides a dynamic and responsive interface to turn CSV data into insightful, interactive diagrams.

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Technology](https://img.shields.io/badge/Tech-D3.js%20%7C%20Vite%20%7C%20JavaScript-blue)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Features

-   **Interactive & Responsive:** Zoom, pan, and drag nodes to organize your workflow. The visualization adapts to your screen size.
-   **Multiple Layouts:** Instantly switch between different layout algorithms:
    -   Force-Directed
    -   Hierarchical (Top-Down)
    -   Hierarchical (Orthogonal)
    -   Circular
    -   Grid
    -   Manual (with Grid-Snapping)
-   **Data-Driven:** Upload your own CSV files to visualize custom workflows. A sample dataset is included to get you started.
-   **Rich UI Controls:**
    -   Search and filter nodes by name, type, or execution method.
    -   Toggle node sizing between uniform and cost-based.
    -   Rotate, flip, center, and fit the graph to the screen.
    -   Save and load custom layouts.
-   **Node Details Panel:** Click any node to see its detailed information.
-   **Connection Verification:** A built-in tool to identify orphaned nodes, broken links, and other inconsistencies in your data.
-   **PDF Export:** Export your current visualization to a high-quality PDF document.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 14.0.0 or higher)
-   [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/workflow-visualizer.git
    cd workflow-visualizer
    ```

2.  **Install dependencies:**
    The project uses `npm` to manage dependencies like D3.js and Vite.
    ```bash
    npm install
    ```

3.  **Run the development server:**
    This command starts a local development server using Vite, which provides hot-reloading and an optimized environment.
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

## Usage

1.  **Load Data:**
    -   Click **Load Sample Data** to see a pre-built example workflow.
    -   Click **Choose CSV File**, select your own data file, and click **Upload CSV**.

2.  **Interact with the Graph:**
    -   **Pan:** Click and drag the background.
    -   **Zoom:** Use your mouse wheel or the `+` / `-` controls.
    -   **Move Nodes:** Click and drag any node. In "Manual (Grid Snap)" layout, nodes will snap to the grid.
    -   **View Details:** Click on a node to open the details panel on the right.

3.  **Use the Controls:**
    -   The left-hand panel provides all the tools to filter, re-arrange, and customize the view. Experiment with different layouts and filters to better understand your workflow.

## Data Format

The application ingests CSV files. The file must contain a header row.

### Required Columns:

-   `Name`: A unique identifier for the node.
-   `Type`: The shape of the node. Supported values:
    -   `Resource` (Rectangle)
    -   `Action` (Triangle)
    -   `State` (Circle)
    -   `Decision` (Diamond)
-   `Incoming`: A comma-separated list of `Name` values for nodes that link *to* this node.

### Optional Columns:

-   `Execution`: Determines the border style.
    -   `Automatic` (Solid)
    -   `Applicant` (Dotted)
    -   Any other value will be Dashed.
-   `Effective Cost` or `Ø Cost`: A numeric value used for cost-based node sizing.
-   `Outgoing1`, `Outgoing2`, ... `Outgoing5`: The `Name` of a node that this node links *to*. (Note: The primary connection logic uses the `Incoming` column, but this is used for verification).
-   `Platform`, `Monitoring`, and other custom fields will be displayed in the Node Details panel.

## Project Structure

```
workflow-visualizer/
├── index.html              # Main application page (entry point)
├── package.json            # Project dependencies and scripts
├── README.md               # This documentation file
├── src/
│   ├── app.js              # Initializes the application
│   ├── style.css           # Main stylesheet
│   └── js/
│       ├── core.js         # Main application class and state management
│       ├── data.js         # Data processing, parsing, and verification
│       ├── export.js       # PDF export logic
│       ├── interactions.js # User interactions (drag, zoom, filters)
│       ├── layouts.js      # All graph layout algorithms
│       ├── render.js       # D3.js rendering logic (nodes, links, SVG)
│       ├── ui.js           # UI-related functions (panels, buttons)
│       └── utils.js        # Utility functions
└── WFR-Processes-Sep25.csv # Sample data file
```

## Technical Details

-   **Core Library:** D3.js v7.9.0
-   **Development Server:** Vite
-   **CSV Parsing:** PapaParse v5.5.3
-   **PDF Generation:** jsPDF & html2canvas

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
