import { jsPDF } from "jspdf";

export const PDFService = {
    generateQuotationPDF: async (quote, logoUrl = null) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = 20;

        // Branding & Header
        doc.setFillColor(255, 72, 72); // Brand color Red
        doc.rect(0, 0, pageWidth, 2, 'F');

        // Logo (Placeholder or real if provided)
        if (logoUrl) {
            try {
                // If logo is SVG or external, it might need conversion. 
                // For now, let's just write text if image loading fails.
                // doc.addImage(logoUrl, 'PNG', margin, currentY, 40, 15);
            } catch (e) {
                console.error("Logo load failed", e);
            }
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("COTIZACIÓN DE MOVIMIENTO", pageWidth - margin, currentY + 10, { align: 'right' });

        currentY += 25;

        // Folio & Date Info Area
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 20, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("FOLIO:", margin + 5, currentY + 7);
        doc.text("FECHA DE EMISIÓN:", margin + 100, currentY + 7);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(quote.folio, margin + 5, currentY + 14);
        doc.text(new Date(quote.created_at).toLocaleDateString(), margin + 100, currentY + 14);

        currentY += 35;

        // Route Details
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DETALLES DE LA RUTA", margin, currentY);
        currentY += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("ORIGEN:", margin, currentY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(quote.origin_address, margin + 25, currentY, { maxWidth: 140 });

        currentY += 15;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("DESTINO:", margin, currentY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(quote.destination_address, margin + 25, currentY, { maxWidth: 140 });

        currentY += 20;

        // Summary Stats (Distance, Time)
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Distancia Total: ${quote.distance_total} km`, margin, currentY);
        doc.text(`Tiempo Est.: ${Math.floor(quote.time_total / 60)}h ${quote.time_total % 60}m`, margin + 60, currentY);

        currentY += 15;

        // Cost Breakdown Table Header
        doc.setFillColor(60, 60, 60);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("DESCRIPCIÓN", margin + 5, currentY + 5.5);
        doc.text("TOTAL", pageWidth - margin - 25, currentY + 5.5, { align: 'right' });

        currentY += 15;

        // Rows
        const rows = [
            { desc: "Servicio de Flete (Logístico)", val: quote.costo_logistico_redondeado },
            { desc: "Casetas y Túneles", val: quote.toll_cost || 0 },
            { desc: "Viáticos de Hospedaje", val: quote.lodging_cost || 0 },
            { desc: "Viáticos de Comidas", val: quote.meal_cost || 0 }
        ];

        doc.setTextColor(50, 50, 50);
        rows.forEach(row => {
            doc.text(row.desc, margin + 5, currentY);
            doc.text(`$${row.val.toLocaleString()}`, pageWidth - margin - 5, currentY, { align: 'right' });
            currentY += 8;
            doc.setDrawColor(240, 240, 240);
            doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
        });

        currentY += 10;

        // Totals area
        const totalsX = pageWidth - margin - 60;
        doc.setFontSize(10);
        doc.text("SUBTOTAL:", totalsX, currentY);
        doc.text(`$${quote.subtotal.toLocaleString()}`, pageWidth - margin - 5, currentY, { align: 'right' });

        currentY += 6;
        doc.text("IVA (16%):", totalsX, currentY);
        doc.text(`$${quote.iva.toLocaleString()}`, pageWidth - margin - 5, currentY, { align: 'right' });

        currentY += 10;
        doc.setFillColor(255, 72, 72);
        doc.rect(totalsX - 5, currentY - 5, 65, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL NETO:", totalsX, currentY + 2.5);
        doc.text(`$${quote.total.toLocaleString()}`, pageWidth - margin - 5, currentY + 2.5, { align: 'right' });

        // Footer / Terms
        currentY = doc.internal.pageSize.getHeight() - 30;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Esta cotización es de carácter informativo y está sujeta a cambios según las condiciones reales del servicio.", pageWidth / 2, currentY, { align: 'center' });
        doc.text("GRUPO LINHER - Soluciones Logísticas | www.grupolinher.com", pageWidth / 2, currentY + 5, { align: 'center' });

        // Save
        doc.save(`Cotización_${quote.folio}.pdf`);
    }
};
