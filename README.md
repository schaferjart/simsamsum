# Workflow Visualizer

Interactive web application for visualizing complex business workflows and process flows. Built with D3.js and modern web technologies.

![Workflow Visualizer](https://img.shields.io/badge/Status-Production%20Ready-green)
![Technology](https://img.shields.io/badge/Tech-D3.js%20%7C%20JavaScript%20%7C%20HTML5%20%7C%20CSS3-blue)


## Demo

Simply open `index.html` in your web browser or serve it with a local server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Supported Data Format

The application expects CSV files with the following columns:

```csv
Name,Type,Execution,Platform,Effective Cost,Incoming,Outgoing1,VarO1,Outgoing2,VarO2,...
```

**Node Types Supported:**
- `Resource` (Rectangle)
- `Action` (Triangle) 
- `State` (Circle)
- `Decision` (Diamond)

**Execution Types:**
- `Automatic` (Solid border)
- `Applicant` (Dotted border)
- Custom execution names

  
## Controls

### Layout Options
- **Force Layout**: Physics-based automatic positioning
- **Hierarchical**: Top-down tree structure
- **Circular**: Nodes arranged in circles
- **Grid**: Organized grid pattern

### Orientation Controls
- **Rotate**: 90° increments (↻ ↺)
- **Flip**: Horizontal and vertical mirroring
- **Reset**: Return to original orientation

### Display Options
- **Size Toggle**: Cost-based vs. uniform node sizing
- **Zoom**: Mouse wheel or touch gestures
- **Pan**: Click and drag background
- **Node Details**: Click any node for information

## Project Structure

```
workflow-visualizer/
├── index.html              # Main application page
├── app.js                  # Core application logic
├── style.css              # Styling and themes
├── WFR-Processes-Sep25.csv # Sample data file
└── README.md              # Documentation
```

## Technical Details

**Built With:**
- **D3.js v7.8.5** - Data visualization and SVG manipulation
- **PapaParse v5.4.1** - CSV parsing and data processing
- **jsPDF** - PDF export functionality
- **html2canvas** - Canvas rendering for exports

**Browser Support:**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### v1.0.0 (25.September 2025)
- ✅ Initial release
- ✅ Interactive workflow visualization
- ✅ Multiple layout algorithms
- ✅ PDF export functionality
- ✅ Cost-based node sizing
- ✅ Connection verification system
- ✅ Responsive design
- ✅ CSV data import

---

**Made with ❤️ for workflow analysis and process optimization**
# workflow-visualizer
