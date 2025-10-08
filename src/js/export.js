import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { showStatus } from './utils.js';

/**
 * Exports the current visualization to a PDF file with options.
 * @param {object} state - The current application state.
 * @param {object} options - Export options.
 * @param {string} options.pageSize - e.g., 'a4', 'a3'.
 * @param {boolean} options.includeBackground - Whether to include background color.
 * @param {object} options.customSize - Custom dimensions { width, height }.
 */
export async function exportToPDF(state, options) {
    const { nodes, links, currentLayout } = state;

    try {
        showStatus('Preparing PDF export...', 'loading');

        const networkGraph = document.getElementById('networkGraph');
        if (!networkGraph || nodes.length === 0) {
            showStatus('No visualization to export', 'error');
            return;
        }

        const elementsToHide = ['.zoom-controls', '.legend', '.controls-panel', '#detailsPanel'];
        const hiddenElements = [];
        elementsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.style.display !== 'none') {
                    hiddenElements.push({ element: el, originalDisplay: el.style.display });
                    el.style.display = 'none';
                }
            });
        });

        await createPDFExport(networkGraph, nodes.length, links.length, currentLayout, options);

        hiddenElements.forEach(({ element, originalDisplay }) => {
            element.style.display = originalDisplay;
        });

        showStatus('PDF exported successfully!', 'success');

    } catch (error) {
        console.error('PDF export error:', error);
        showStatus('Error exporting PDF', 'error');
    }
}

/**
 * Creates the PDF content and triggers the download.
 * @param {HTMLElement} networkGraph - The container of the SVG visualization.
 * @param {number} nodeCount - Total number of nodes.
 * @param {number} linkCount - Total number of links.
 * @param {string} layout - The current graph layout.
 * @param {object} options - PDF export options.
 * @private
 */
async function createPDFExport(networkGraph, nodeCount, linkCount, layout, options) {
    const { pageSize, includeBackground, customSize } = options;

    const exportContainer = document.createElement('div');
    const backgroundColor = includeBackground ? getComputedStyle(document.body).backgroundColor : 'white';

    exportContainer.style.cssText = `
        position: fixed; top: -10000px; left: -10000px;
        width: 1600px; height: 1200px; background: ${backgroundColor};
        padding: 20px; font-family: Arial, sans-serif;
    `;
    document.body.appendChild(exportContainer);

    const header = document.createElement('div');
    header.style.cssText = `text-align: center; margin-bottom: 20px; font-size: 24px; font-weight: bold; color: #333;`;
    header.textContent = 'Workflow Visualization';
    exportContainer.appendChild(header);

    const metadata = document.createElement('div');
    metadata.style.cssText = `display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666;`;
    metadata.innerHTML = `
        <div>
            <div>Total Nodes: ${nodeCount}</div>
            <div>Total Links: ${linkCount}</div>
            <div>Layout: ${layout}</div>
        </div>
        <div>
            <div>Export Date: ${new Date().toLocaleDateString()}</div>
            <div>Export Time: ${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    exportContainer.appendChild(metadata);

    const svgElement = networkGraph.querySelector('svg');
    if (svgElement) {
        const svgClone = svgElement.cloneNode(true);
        const bbox = svgElement.getBBox();
        const margin = 50;
        const width = Math.max(1160, bbox.width + margin * 2);
        const height = Math.max(700, bbox.height + margin * 2);

        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.setAttribute('viewBox', `${bbox.x - margin} ${bbox.y - margin} ${width} ${height}`);
        svgClone.style.border = '1px solid #ddd';
        svgClone.style.backgroundColor = 'white';
        exportContainer.appendChild(svgClone);
    }

    const canvas = await html2canvas(exportContainer, {
        scale: 2,
        backgroundColor: backgroundColor,
        useCORS: true
    });

    let pdfOptions = { orientation: 'landscape', unit: 'mm', format: pageSize };
    if (pageSize === 'custom' && customSize) {
        pdfOptions = { unit: 'mm', format: [customSize.width, customSize.height] };
    }

    const pdf = new jsPDF(pdfOptions);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const aspectRatio = canvas.width / canvas.height;

    let imgWidth, imgHeight;
    if (aspectRatio > pageWidth / pageHeight) {
        imgWidth = pageWidth;
        imgHeight = pageWidth / aspectRatio;
    } else {
        imgHeight = pageHeight;
        imgWidth = pageHeight * aspectRatio;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`workflow-visualization-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.pdf`);
    document.body.removeChild(exportContainer);
}

/**
 * Exports the current visualization to an SVG file.
 * @param {object} options - Export options.
 * @param {boolean} options.includeBackground - Whether to include background color.
 */
export function exportToSVG(options) {
    try {
        showStatus('Preparing SVG export...', 'loading');
        const svgElement = document.getElementById('networkGraph').querySelector('svg');
        if (!svgElement) {
            showStatus('No visualization to export', 'error');
            return;
        }

        const svgClone = svgElement.cloneNode(true);
        if (options.includeBackground) {
            const style = document.createElement('style');
            style.textContent = `svg { background-color: ${getComputedStyle(document.body).backgroundColor}; }`;
            svgClone.insertBefore(style, svgClone.firstChild);
        }

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgClone);

        svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-visualization-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('SVG exported successfully!', 'success');

    } catch (error) {
        console.error('SVG export error:', error);
        showStatus('Error exporting SVG', 'error');
    }
}