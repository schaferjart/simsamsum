import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { showStatus } from './utils.js';

/**
 * Exports the current visualization to a PDF file.
 * @param {object} state - The current application state.
 */
export async function exportToPDF(state) {
    const { nodes, links, currentLayout } = state;

    try {
        showStatus('Preparing PDF export...', 'loading');

        const networkGraph = document.getElementById('networkGraph');
        if (!networkGraph || nodes.length === 0) {
            showStatus('No visualization to export', 'error');
            return;
        }

        // Temporarily hide UI elements that shouldn't be in the PDF
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

        await createPDFExport(networkGraph, nodes.length, links.length, currentLayout);

        // Restore hidden elements
        hiddenElements.forEach(({ element, originalDisplay }) => {
            element.style.display = originalDisplay;
        });

        showStatus('PDF exported successfully!', 'success');

    } catch (error) {
        console.error('PDF export error:', error);
        showStatus('Error exporting PDF', 'error');
    }
}

async function createPDFExport(networkGraph, nodeCount, linkCount, layout) {
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1600px;
        height: 1200px;
        background: white;
        padding: 20px;
        font-family: Arial, sans-serif;
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

        svgClone.querySelectorAll('text').forEach(text => {
            text.style.fill = '#333';
            text.style.fontSize = text.style.fontSize || '12px';
        });

        exportContainer.appendChild(svgClone);
    }

    const canvas = await html2canvas(exportContainer, {
        width: 1200,
        height: 800,
        scale: 2,
        backgroundColor: 'white',
        logging: false,
        useCORS: true
    });

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
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

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    pdf.save(`workflow-visualization-${timestamp}.pdf`);

    document.body.removeChild(exportContainer);
}