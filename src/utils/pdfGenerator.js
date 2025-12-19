import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
};

const capitalize = (s) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
};

export const generateServiceLogPDF = async (logData, partsData = []) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Colors
        const primaryColor = [0, 85, 184]; // Foton Blue
        const secondaryColor = [100, 100, 100]; // Grey

        // --- HEADER ---
        // Load Logo
        try {
            const logoImg = await loadImage('/logo.png');
            // Aspect ratio calculation if needed, but fixed size is often safer for headers
            // Assuming logo is somewhat rectangular
            doc.addImage(logoImg, 'PNG', 14, 10, 50, 20);
        } catch (e) {
            console.warn("Could not load logo", e);
            // Fallback to text if logo fails
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text("FOTON CIP", 14, 25);
        }

        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        doc.setFont('helvetica', 'normal');
        doc.text("Reporte de Servicio Técnico", 14, 35);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 40);

        // Service ID / Date (Right aligned)
        doc.setFontSize(10);
        const folio = logData.id_cita || 'N/A';
        const fecha = logData.fecha_cita ? new Date(logData.fecha_cita).toLocaleDateString() : new Date().toLocaleDateString();

        doc.text(`Folio: #${folio}`, pageWidth - 14, 20, { align: 'right' });
        doc.text(`Fecha del Servicio: ${fecha}`, pageWidth - 14, 26, { align: 'right' });

        if (logData.fecha_finalizacion) {
            try {
                const dateObj = new Date(logData.fecha_finalizacion);
                if (!isNaN(dateObj.getTime())) {
                    const fechaFin = dateObj.toLocaleDateString();
                    doc.text(`Finalizado: ${fechaFin}`, pageWidth - 14, 32, { align: 'right' });
                } else {
                    console.warn("Invalid date format:", logData.fecha_finalizacion);
                }
            } catch (e) {
                console.error("Error parsing date:", e);
            }
        }

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 45, pageWidth - 14, 45);

        // --- CLIENT & VEHICLE INFO ---
        let yPos = 55;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Información del Cliente y Vehículo", 14, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Grid layout for info
        const col1 = 14;
        const col2 = pageWidth / 2 + 10;

        doc.text(`Cliente:`, col1, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.clientName || 'N/A'}`, col1 + 20, yPos);

        doc.text(`Vehículo:`, col2, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.vehicleName || 'N/A'}`, col2 + 20, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Técnico:`, col1, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.technicianName || 'N/A'}`, col1 + 20, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text(`VIN:`, col2, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.vehicleVIN || 'N/A'}`, col2 + 20, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Servicio:`, col1, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.serviceName || 'N/A'}`, col1 + 20, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text(`Estado:`, col2, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`${logData.estado_cita || 'N/A'}`, col2 + 20, yPos);

        yPos += 15;

        // --- CHECKLIST ---
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Lista de Verificación", 14, yPos);
        yPos += 5;

        const checklistData = Object.entries(logData.checklist || {}).map(([item, status]) => [
            capitalize(item),
            status ? 'Completado' : 'Pendiente'
        ]);

        if (checklistData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Punto de Revisión', 'Estado']],
                body: checklistData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 40, halign: 'center' }
                }
            });
            yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 20;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100);
            doc.text("No hay puntos de verificación registrados.", 14, yPos + 5);
            yPos += 15;
        }

        // --- COST BREAKDOWN ---
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Desglose del Servicio", 14, yPos);
        yPos += 5;

        // Prepare table data: Service Base Cost + Spare Parts
        const tableData = [];

        // 1. Base Service Cost
        const baseCost = parseFloat(logData.costo_servicio_base) || 0;
        if (baseCost > 0 || logData.serviceName) {
            tableData.push([
                logData.serviceName || 'Servicio Base',
                '1',
                `$${baseCost.toFixed(2)}`,
                `$${baseCost.toFixed(2)}`
            ]);
        }

        // 2. Spare Parts
        if (partsData.length > 0) {
            partsData.forEach(p => {
                const cost = parseFloat(p.costo_unitario) || 0;
                const qty = parseInt(p.cantidad_usada || p.cantidad) || 0;
                tableData.push([
                    p.nombre || 'Refacción',
                    qty,
                    `$${cost.toFixed(2)}`,
                    `$${(cost * qty).toFixed(2)}`
                ]);
            });
        }

        if (tableData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Concepto', 'Cant.', 'Costo Unit.', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 30, halign: 'right' },
                    3: { cellWidth: 30, halign: 'right' }
                }
            });
            yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 20;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100);
            doc.text("No hay costos registrados.", 14, yPos + 5);
            yPos += 15;
        }

        // --- OBSERVATIONS ---
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Observaciones", 14, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50);

        const observations = logData.observaciones || "Sin observaciones registradas.";
        const splitObservaciones = doc.splitTextToSize(observations, pageWidth - 28);
        doc.text(splitObservaciones, 14, yPos);

        yPos += (splitObservaciones.length * 5) + 15;

        // --- TOTALS ---
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Right aligned totals box
        const boxWidth = 90; // Increased width
        const boxX = pageWidth - 14 - boxWidth;
        const boxHeight = 35; // Increased height

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');

        // Calculate totals if not provided explicitly (though logData.costo_final should be there)
        const finalCost = parseFloat(logData.costo_final) || 0;

        // Label on top left of box
        doc.text("Costo Total del Servicio:", boxX + 5, yPos + 12);

        // Amount on bottom right of box
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text(`$${finalCost.toFixed(2)} MXN`, boxX + boxWidth - 5, yPos + 28, { align: 'right' });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        // Save
        doc.save(`Reporte_Servicio_${logData.id_cita}_${new Date().getTime()}.pdf`);
    } catch (error) {
        console.error("Error in generateServiceLogPDF:", error);
        throw error;
    }
};
