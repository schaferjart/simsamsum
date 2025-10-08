import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { showStatus } from './utils.js';
import { getExportSettings, getPageDimensions, getExportFrameBounds } from './ui/export-settings-manager.js';

/**
 * Exports the current visualization based on settings from the export modal.
 * Listens for the confirmExport event triggered by the export settings manager.
 * @param {object} state - The current application state.
 */
export function initExportHandler(state) {
    window.addEventListener('confirmExport', async (event) => {
        const settings = event.detail;
        
        if (settings.format === 'pdf') {
            await exportToPDF(state, settings);
        } else if (settings.format === 'svg') {
            exportToSVG(settings);
        }
    });
}

/**
 * Exports the current visualization to a vector-based PDF file.
 * Uses svg2pdf.js to convert SVG directly to PDF without rasterization.
 * @param {object} state - The current application state.
 * @param {object} settings - Export settings from the export modal.
 */
export async function exportToPDF(state, settings) {
    const { nodes, links, currentLayout } = state;

    try {
        showStatus('Preparing vector PDF export...', 'loading');

        const networkGraph = document.getElementById('networkGraph');
        const svgElement = networkGraph?.querySelector('svg');
        
        if (!svgElement || nodes.length === 0) {
            showStatus('No visualization to export', 'error');
            return;
        }

        // Get page dimensions from settings
        const dimensions = getPageDimensions();
        const { width: pageWidth, height: pageHeight } = dimensions;

        // Create jsPDF instance with proper orientation
        const pdf = new jsPDF({
            orientation: settings.orientation || 'landscape',
            unit: 'mm',
            format: [pageWidth, pageHeight]
        });

        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);

        // Check if there's a custom export frame
        const frameBounds = getExportFrameBounds();
        let svgBBox;
        
        if (frameBounds) {
            // Use custom frame bounds
            svgBBox = frameBounds;
            showStatus('Exporting custom area...', 'loading');
        } else {
            // Use full SVG bounds
            svgBBox = svgElement.getBBox();
        }
        
        const svgWidth = svgBBox.width;
        const svgHeight = svgBBox.height;

        // Calculate scaling to fit content on page with margins
        const margin = 10; // mm
        const availableWidth = pageWidth - (2 * margin);
        const availableHeight = pageHeight - (2 * margin);
        
        const scaleX = availableWidth / svgWidth;
        const scaleY = availableHeight / svgHeight;
        const scale = Math.min(scaleX, scaleY);

        // Calculate centered position
        const scaledWidth = svgWidth * scale;
        const scaledHeight = svgHeight * scale;
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        // Set the viewBox and dimensions on the clone
        svgClone.setAttribute('width', svgWidth);
        svgClone.setAttribute('height', svgHeight);
        
        // Use custom frame viewBox if available, otherwise use full SVG
        if (frameBounds) {
            svgClone.setAttribute('viewBox', `${svgBBox.x} ${svgBBox.y} ${svgWidth} ${svgHeight}`);
        } else {
            svgClone.setAttribute('viewBox', `${svgBBox.x} ${svgBBox.y} ${svgWidth} ${svgHeight}`);
        }
        
        // Prepare SVG for export AFTER viewBox is set (so background uses correct coordinates)
        prepareSVGForExport(svgClone, settings);

        // Add metadata to PDF
        pdf.setProperties({
            title: 'Workflow Visualization',
            subject: `${nodes.length} nodes, ${links.length} links, Layout: ${currentLayout}`,
            author: 'Workflow Visualizer',
            keywords: 'workflow, visualization, diagram',
            creator: 'Workflow Visualizer App'
        });

        // Add header/footer metadata
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Workflow Visualization - ${currentLayout}`, margin, 8);
        pdf.text(`Nodes: ${nodes.length} | Links: ${links.length}`, margin, pageHeight - 5);
        pdf.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, pageHeight - 5);

        // Convert SVG to PDF as vector graphics (this is the key improvement!)
        await pdf.svg(svgClone, {
            x: x,
            y: y,
            width: scaledWidth,
            height: scaledHeight
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `workflow-visualization-${timestamp}.pdf`;

        // Save the PDF
        pdf.save(filename);

        showStatus('Vector PDF exported successfully!', 'success');

    } catch (error) {
        console.error('PDF export error:', error);
        showStatus(`Error exporting PDF: ${error.message}`, 'error');
    }
}

/**
 * Prepares an SVG element for export by cleaning up styles and attributes.
 * @param {SVGElement} svgClone - The cloned SVG element to prepare.
 * @param {object} settings - Export settings.
 */
function prepareSVGForExport(svgClone, settings) {
    // Set background if requested
    if (settings.includeBackground) {
        // Get background color from body's actual computed background
        // This properly resolves CSS variables
        let bgColor = getComputedStyle(document.body).backgroundColor;
        
        console.log('📄 Raw background color:', bgColor);
        
        // If transparent or not set, try the networkGraph container
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            const networkGraph = document.getElementById('networkGraph');
            if (networkGraph) {
                bgColor = getComputedStyle(networkGraph).backgroundColor;
                console.log('📄 Network graph background:', bgColor);
            }
        }
        
        // If still transparent, use a sensible default based on theme
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            bgColor = isDark ? '#1a1a1a' : '#fcfcf9';
            console.log('📄 Using default for theme:', isDark ? 'dark' : 'light', bgColor);
        }
        
        console.log('📄 Final export background color:', bgColor);
        
        // Get the viewBox to ensure background covers everything
        const viewBox = svgClone.getAttribute('viewBox');
        let x = 0, y = 0, width = '100%', height = '100%';
        
        if (viewBox) {
            const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
            x = vbX;
            y = vbY;
            width = vbWidth;
            height = vbHeight;
        }
        
        // Create background rectangle
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', x);
        bgRect.setAttribute('y', y);
        bgRect.setAttribute('width', width);
        bgRect.setAttribute('height', height);
        bgRect.setAttribute('fill', bgColor);
        
        // Insert as first child so it's behind everything
        svgClone.insertBefore(bgRect, svgClone.firstChild);
    }

    // Ensure text elements have proper styling for PDF
    svgClone.querySelectorAll('text').forEach(text => {
        if (!text.style.fill || text.style.fill === '') {
            text.style.fill = '#333';
        }
        if (!text.style.fontFamily || text.style.fontFamily === '') {
            text.style.fontFamily = 'Arial, sans-serif';
        }
    });

    // Ensure proper stroke styles
    svgClone.querySelectorAll('line, path, circle, rect, polygon').forEach(elem => {
        if (elem.style.stroke && elem.style.stroke !== 'none') {
            // Make sure stroke-width is set
            if (!elem.style.strokeWidth) {
                elem.style.strokeWidth = elem.getAttribute('stroke-width') || '1';
            }
        }
    });

    return svgClone;
}

/**
 * Exports the current visualization to an SVG file.
 * @param {object} settings - Export settings from the export modal.
 */
export function exportToSVG(settings) {
    try {
        showStatus('Preparing SVG export...', 'loading');
        
        const svgElement = document.getElementById('networkGraph')?.querySelector('svg');
        if (!svgElement) {
            showStatus('No visualization to export', 'error');
            return;
        }

        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);
        
        // Add background if requested
        if (settings.includeBackground) {
            const bgColor = getComputedStyle(document.body).backgroundColor;
            const style = document.createElement('style');
            style.textContent = `svg { background-color: ${bgColor}; }`;
            svgClone.insertBefore(style, svgClone.firstChild);
        }

        // Serialize the SVG to a string
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgClone);

        // Add XML declaration
        svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

        // Create blob and download
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        
        a.href = url;
        a.download = `workflow-visualization-${timestamp}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('SVG exported successfully!', 'success');

    } catch (error) {
        console.error('SVG export error:', error);
        showStatus(`Error exporting SVG: ${error.message}`, 'error');
    }
}