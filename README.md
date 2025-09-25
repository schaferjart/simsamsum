# Workflow Visualizer

A powerful, interactive web application for visualizing complex business workflows and process flows. Built with D3.js and modern web technologies.

![Workflow Visualizer](https://img.shields.io/badge/Status-Production%20Ready-green)
![Technology](https://img.shields.io/badge/Tech-D3.js%20%7C%20JavaScript%20%7C%20HTML5%20%7C%20CSS3-blue)

## 🚀 Features

- **Interactive Network Diagrams**: Drag-and-drop nodes, zoom, pan, and rotate visualizations
- **Multiple Layout Algorithms**: Force-directed, hierarchical, circular, and grid layouts
- **Cost-Based Sizing**: Dynamic node sizing based on process costs
- **Data Import**: CSV file support with automatic parsing and validation
- **PDF Export**: High-quality PDF generation with professional formatting
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Connection Verification**: Validates workflow integrity and identifies broken links

## 🎯 Live Demo

Simply open `index.html` in your web browser or serve it with a local server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## 📊 Supported Data Format

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

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/workflow-visualizer.git
   cd workflow-visualizer
   ```

2. **Start a local server**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

4. **Load your data**
   - Click "Load CSV File" to import your workflow data
   - Or use the sample data that's included

## 🎮 Controls

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

## 📁 Project Structure

```
workflow-visualizer/
├── index.html              # Main application page
├── app.js                  # Core application logic
├── style.css              # Styling and themes
├── WFR-Processes-Sep25.csv # Sample data file
└── README.md              # Documentation
```

## 🔧 Technical Details

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

## 📈 Advanced Features

### Connection Verification
Automatically validates workflow connections and identifies:
- Missing target nodes
- Bidirectional link consistency
- Orphaned nodes
- Probability value validation

### PDF Export
Generate professional PDFs with:
- High-resolution visualization capture
- Automatic scaling to fit A4 landscape
- Timestamp-based file naming
- Metadata inclusion

### Data Processing
- Handles multiple CSV formats
- Automatic data type detection
- Null value handling
- Cost calculation and normalization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the console for error messages
- Ensure your CSV file follows the expected format

## 🏗️ Development

For local development:

```bash
# Clone the repo
git clone https://github.com/yourusername/workflow-visualizer.git

# Navigate to directory
cd workflow-visualizer

# Start development server
python3 -m http.server 8000

# Or use Node.js
npx http-server
```

## 📋 Changelog

### v1.0.0 (September 2025)
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
