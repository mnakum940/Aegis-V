// ===== PDF EXPORT FUNCTIONALITY =====

// Add event listener for PDF download button
document.addEventListener('DOMContentLoaded', () => {
    const pdfBtn = document.getElementById('downloadPdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', generatePDFReport);
    }
});

async function generatePDFReport() {
    const { jsPDF } = window.jspdf;

    if (!jsPDF || !window.html2canvas) {
        alert('PDF libraries not loaded. Please refresh the page and try again.');
        return;
    }

    const btn = document.getElementById('downloadPdfBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = 15;

        // ===== HEADER =====
        pdf.setFontSize(20);
        pdf.setTextColor(0, 255, 136);
        pdf.text('AEGIS V - DASHBOARD REPORT', pageWidth / 2, yPosition, { align: 'center' });

        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        const timestamp = new Date().toLocaleString();
        pdf.text(`Generated: ${timestamp}`, pageWidth / 2, yPosition, { align: 'center' });

        yPosition += 10;
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(0, 255, 136);
        pdf.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 10;

        // ===== STATISTICS =====
        pdf.setFontSize(14);
        pdf.setTextColor(0, 180, 100);
        pdf.text('System Statistics', 15, yPosition);
        yPosition += 7;

        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);
        const stats = [
            `Total Requests: ${document.getElementById('totalRequests').textContent}`,
            `Threats Blocked: ${document.getElementById('totalBlocked').textContent}`,
            `Accuracy: ${document.getElementById('accuracyStat').textContent}`,
            `Avg Latency: ${document.getElementById('avgLatency').textContent}`,
            `Total Antibodies: ${document.getElementById('totalAntibodies').textContent}`
        ];

        stats.forEach(stat => {
            pdf.text(stat, 20, yPosition);
            yPosition += 6;
        });

        yPosition += 5;

        // ===== CAPTURE CHARTS =====
        const chartIds = ['trafficChart', 'attackDistChart', 'latencyChart', 'accuracyChart'];

        for (const chartId of chartIds) {
            const chartElement = document.getElementById(chartId);
            if (chartElement && yPosition < pageHeight - 80) {
                try {
                    const canvas = await html2canvas(chartElement.closest('.chart-card'), {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 30;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    // Add new page if needed
                    if (yPosition + imgHeight > pageHeight - 20) {
                        pdf.addPage();
                        yPosition = 15;
                    }

                    pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + 10;
                } catch (err) {
                    console.error(`Failed to capture ${chartId}:`, err);
                }
            }
        }

        // ===== CAPTURE 3D CHART =====
        const scatter3D = document.getElementById('riskScatter3D');
        if (scatter3D) {
            pdf.addPage();
            yPosition = 15;

            pdf.setFontSize(14);
            pdf.setTextColor(0, 180, 100);
            pdf.text('3D Risk Analysis', 15, yPosition);
            yPosition += 10;

            try {
                const canvas = await html2canvas(scatter3D.closest('.chart-card'), {
                    scale: 2,
                    backgroundColor: '#ffffff'
                });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 30;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - 20));
            } catch (err) {
                console.error('Failed to capture 3D chart:', err);
            }
        }

        // ===== CAPTURE TABLES =====
        pdf.addPage();
        yPosition = 15;

        pdf.setFontSize(14);
        pdf.setTextColor(0, 180, 100);
        pdf.text('Data Tables', 15, yPosition);
        yPosition += 10;

        const tableIds = ['logsTable', 'blockedTable', 'antibodyTable'];
        for (const tableId of tableIds) {
            const tableElement = document.getElementById(tableId);
            if (tableElement) {
                try {
                    const canvas = await html2canvas(tableElement.closest('.table-container, .chart-card'), {
                        scale: 1.5,
                        backgroundColor: '#ffffff'
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 30;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    // Add new page if needed
                    if (yPosition + imgHeight > pageHeight - 20) {
                        pdf.addPage();
                        yPosition = 15;
                    }

                    pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - 20));
                    yPosition += Math.min(imgHeight, pageHeight - yPosition - 20) + 10;
                } catch (err) {
                    console.error(`Failed to capture ${tableId}:`, err);
                }
            }
        }

        // ===== SAVE PDF =====
        const filename = `Aegis_V_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(filename);

        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> EXPORT PDF';

        // Show success message
        showSuccess('PDF report downloaded successfully!');

    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> EXPORT PDF';
    }
}

function showSuccess(msg) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0, 255, 136, 0.9); color:#0d0d0d; padding:15px 30px; border-radius:8px; z-index:9999; font-family:"Courier New"; border:1px solid #00ff88; backdrop-filter:blur(5px); box-shadow:0 0 20px rgba(0,255,136,0.4); font-weight:bold;';
    successDiv.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${msg}`;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
}
