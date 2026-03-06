import { jsPDF } from 'jspdf';
import { quotationService } from './api';

const PROJECT_TIMEZONE = 'America/Mexico_City';

const COLORS = {
    primary: [255, 72, 72],
    dark: [13, 22, 38],
    text: [31, 42, 55],
    muted: [105, 117, 138],
    panel: [246, 248, 252],
    panelBorder: [228, 234, 245],
    successSoft: [236, 250, 242]
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const safeText = (value, fallback = 'N/D') => (
    typeof value === 'string' && value.trim() ? value.trim() : fallback
);

const formatCurrency = (value) => (
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(toNumber(value))
);

const formatIssueDate = (rawDate) => {
    if (!rawDate) {
        return 'N/D';
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
        return 'N/D';
    }

    return parsed.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: PROJECT_TIMEZONE
    });
};

const formatMinutes = (value) => {
    const totalMinutes = Math.max(0, Math.round(toNumber(value)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const sumServiceCosts = (services) => (
    Array.isArray(services)
        ? services.reduce((accumulator, service) => accumulator + toNumber(service.cost), 0)
        : 0
);

const sumServiceTime = (services) => (
    Array.isArray(services)
        ? services.reduce((accumulator, service) => accumulator + toNumber(service.time_minutes), 0)
        : 0
);

const resolveQuoteForPdf = async (quoteOrId) => {
    const directId = typeof quoteOrId === 'number' || typeof quoteOrId === 'string'
        ? quoteOrId
        : null;
    const objectId = quoteOrId && typeof quoteOrId === 'object'
        ? quoteOrId.id
        : null;
    const quoteId = directId ?? objectId;

    if (quoteId) {
        return quotationService.get(quoteId);
    }

    if (quoteOrId && typeof quoteOrId === 'object') {
        return quoteOrId;
    }

    throw new Error('Se requiere el id de una cotización para generar el PDF.');
};

const normalizeQuote = (rawQuote) => {
    const services = Array.isArray(rawQuote.services) ? rawQuote.services : [];
    const serviceCosts = rawQuote.service_costs !== undefined
        ? toNumber(rawQuote.service_costs)
        : sumServiceCosts(services);
    const serviceTime = sumServiceTime(services);

    const logisticsCost = toNumber(rawQuote.logistics_cost_rounded ?? rawQuote.costo_logistico_redondeado);
    const lodgingCost = toNumber(rawQuote.lodging_cost);
    const mealCost = toNumber(rawQuote.meal_cost);
    const viaticosOperativos = lodgingCost + mealCost;

    const hasExtraServices = services.length > 0 || serviceCosts > 0;
    const quoteType = hasExtraServices ? 'services' : 'logistics';

    const subtotal = rawQuote.subtotal !== undefined
        ? toNumber(rawQuote.subtotal)
        : logisticsCost + viaticosOperativos + serviceCosts;
    const iva = rawQuote.iva !== undefined ? toNumber(rawQuote.iva) : subtotal * 0.16;
    const total = rawQuote.total !== undefined ? toNumber(rawQuote.total) : subtotal + iva;

    const timeTotal = toNumber(rawQuote.time_total);
    const timeWithServices = rawQuote.time_services_min !== undefined
        ? toNumber(rawQuote.time_services_min)
        : timeTotal + serviceTime;

    const vehicleName = safeText(rawQuote.vehicle_name, '');
    const vehiclePlate = safeText(rawQuote.vehicle_plate, '');
    const unitUsed = vehicleName || vehiclePlate
        ? [vehicleName, vehiclePlate].filter(Boolean).join(' - ')
        : 'N/D';

    return {
        id: rawQuote.id,
        folio: safeText(rawQuote.folio, 'SIN-FOLIO'),
        created_at: rawQuote.created_at,
        quoteType,
        quoteTypeTitle: quoteType === 'services' ? 'COTIZACIÓN DE SERVICIOS' : 'COTIZACIÓN LOGÍSTICA',
        quoteTypeLabel: quoteType === 'services' ? 'Servicios' : 'Logística',
        originAddress: safeText(rawQuote.origin_address),
        destinationAddress: safeText(rawQuote.destination_address),
        stopCount: Array.isArray(rawQuote.stops) ? rawQuote.stops.length : 0,
        distanceTotal: toNumber(rawQuote.distance_total),
        timeTotal,
        timeWithServices,
        unitUsed,
        logisticsCost,
        serviceCosts,
        viaticosOperativos,
        subtotal,
        iva,
        total,
        services
    };
};

const setDrawColor = (doc, color) => {
    doc.setDrawColor(color[0], color[1], color[2]);
};

const setTextColor = (doc, color) => {
    doc.setTextColor(color[0], color[1], color[2]);
};

const setFillColor = (doc, color) => {
    doc.setFillColor(color[0], color[1], color[2]);
};

const ensureSpace = (doc, currentY, requiredSpace) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if ((currentY + requiredSpace) <= pageHeight - 25) {
        return currentY;
    }

    doc.addPage();
    return 20;
};

const drawSectionTitle = (doc, x, y, title) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setTextColor(doc, COLORS.text);
    doc.text(title, x, y);
    setDrawColor(doc, COLORS.panelBorder);
    doc.line(x, y + 2, doc.internal.pageSize.getWidth() - x, y + 2);
    return y + 8;
};

const drawMetricCard = (doc, { x, y, width, height, label, value }) => {
    setFillColor(doc, COLORS.panel);
    setDrawColor(doc, COLORS.panelBorder);
    doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, COLORS.muted);
    doc.text(label.toUpperCase(), x + 4, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setTextColor(doc, COLORS.text);
    const valueLines = doc.splitTextToSize(String(value), width - 8);
    doc.text(valueLines, x + 4, y + 11);
};

const drawRouteField = (doc, { x, y, width, label, value }) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(doc, COLORS.muted);
    doc.text(label, x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, COLORS.text);
    const lines = doc.splitTextToSize(value, width - 24);
    doc.text(lines, x + 24, y);

    const linesCount = Array.isArray(lines) ? lines.length : 1;
    return y + Math.max(8, (linesCount * 4.6) + 2);
};

const drawAmountRow = (doc, { x, y, width, label, value }) => {
    const rowHeight = 9;
    const textY = y + 5.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setTextColor(doc, COLORS.text);
    doc.text(label, x, textY);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(value), x + width, textY, { align: 'right' });

    setDrawColor(doc, COLORS.panelBorder);
    doc.line(x, y + rowHeight, x + width, y + rowHeight);
    return y + rowHeight;
};

export const PDFService = {
    generateQuotationPDF: async (quoteOrId, logoUrl = null) => {
        const rawQuote = await resolveQuoteForPdf(quoteOrId);
        const quote = normalizeQuote(rawQuote);

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let currentY = 20;

        setFillColor(doc, COLORS.dark);
        doc.rect(0, 0, pageWidth, 36, 'F');
        setFillColor(doc, COLORS.primary);
        doc.rect(0, 0, pageWidth, 3, 'F');

        if (logoUrl) {
            try {
                doc.addImage(logoUrl, 'PNG', margin, 8, 26, 10);
            } catch (error) {
                console.error('Logo load failed:', error);
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(quote.quoteTypeTitle, margin, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(224, 232, 246);
        doc.text('Propuesta económica ', margin, 21);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Folio: ${quote.folio}`, pageWidth - margin, 14, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de emisión: ${formatIssueDate(quote.created_at)}`, pageWidth - margin, 20, { align: 'right' });

        setFillColor(doc, COLORS.successSoft);
        doc.roundedRect(pageWidth - margin - 48, 24, 48, 8, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        setTextColor(doc, [31, 82, 56]);
        doc.text(`Tipo: ${quote.quoteTypeLabel}`, pageWidth - margin - 24, 29.2, { align: 'center' });

        currentY = 44;
        currentY = drawSectionTitle(doc, margin, currentY, 'Resumen operativo');

        const metricGap = 4;
        const metricWidth = (contentWidth - (metricGap * 2)) / 3;
        const metricHeight = 17;

        drawMetricCard(doc, {
            x: margin,
            y: currentY,
            width: metricWidth,
            height: metricHeight,
            label: 'Distancia total',
            value: `${quote.distanceTotal.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km`
        });
        drawMetricCard(doc, {
            x: margin + metricWidth + metricGap,
            y: currentY,
            width: metricWidth,
            height: metricHeight,
            label: 'Tiempo base',
            value: formatMinutes(quote.timeTotal)
        });
        drawMetricCard(doc, {
            x: margin + ((metricWidth + metricGap) * 2),
            y: currentY,
            width: metricWidth,
            height: metricHeight,
            label: 'Tiempo con servicios',
            value: formatMinutes(quote.timeWithServices)
        });

        currentY += metricHeight + 8;

        drawMetricCard(doc, {
            x: margin,
            y: currentY,
            width: contentWidth,
            height: 15,
            label: 'Unidad utilizada',
            value: quote.unitUsed
        });

        currentY += 29;
        currentY = ensureSpace(doc, currentY, 48);
        currentY = drawSectionTitle(doc, margin, currentY, 'Ruta del servicio');
        currentY += 2;

        currentY = drawRouteField(doc, {
            x: margin,
            y: currentY,
            width: contentWidth,
            label: 'Origen:',
            value: quote.originAddress
        });

        currentY = drawRouteField(doc, {
            x: margin,
            y: currentY,
            width: contentWidth,
            label: 'Destino:',
            value: quote.destinationAddress
        });

        currentY += 4;

        currentY = ensureSpace(doc, currentY, 70);
        currentY = drawSectionTitle(doc, margin, currentY, 'Propuesta económica');

        let amountY = currentY - 1;
        amountY = drawAmountRow(doc, {
            x: margin,
            y: amountY,
            width: contentWidth,
            label: 'Servicio de flete integral',
            value: quote.logisticsCost
        });

        if (quote.serviceCosts > 0) {
            amountY = drawAmountRow(doc, {
                x: margin,
                y: amountY,
                width: contentWidth,
                label: 'Servicios complementarios',
                value: quote.serviceCosts
            });
        }

        if (quote.viaticosOperativos > 0) {
            amountY = drawAmountRow(doc, {
                x: margin,
                y: amountY,
                width: contentWidth,
                label: 'Costos operativos',
                value: quote.viaticosOperativos
            });
        }

        currentY = amountY + 8;

        setFillColor(doc, COLORS.panel);
        setDrawColor(doc, COLORS.panelBorder);
        doc.roundedRect(margin, currentY, contentWidth, 29, 2.5, 2.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setTextColor(doc, COLORS.muted);
        doc.text('Subtotal', margin + 5, currentY + 7);
        doc.text('IVA (16%)', margin + 5, currentY + 13);
        doc.text('Total final', margin + 5, currentY + 23);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        setTextColor(doc, COLORS.text);
        doc.text(formatCurrency(quote.subtotal), margin + contentWidth - 5, currentY + 7, { align: 'right' });
        doc.text(formatCurrency(quote.iva), margin + contentWidth - 5, currentY + 13, { align: 'right' });
        setFillColor(doc, COLORS.primary);
        doc.roundedRect(margin + 3, currentY + 16.2, contentWidth - 6, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11.5);
        doc.text('Total final', margin + 7, currentY + 22.9);
        doc.text(formatCurrency(quote.total), margin + contentWidth - 7, currentY + 22.9, { align: 'right' });

        currentY += 42;

        if (quote.services.length > 0) {
            currentY = ensureSpace(doc, currentY, 24);
            currentY = drawSectionTitle(doc, margin, currentY, 'Servicios incluidos');
            currentY += 2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            setTextColor(doc, COLORS.text);

            quote.services.slice(0, 10).forEach((service) => {
                currentY = ensureSpace(doc, currentY, 6);
                const serviceName = safeText(service.service_name || service.name, 'Servicio');
                doc.text(`- ${serviceName}`, margin + 2, currentY);
                currentY += 5;
            });
        }

        const footerY = doc.internal.pageSize.getHeight() - 18;
        setDrawColor(doc, COLORS.panelBorder);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setTextColor(doc, COLORS.muted);
        doc.text(
            'Esta cotización es informativa y puede ajustarse según condiciones reales de operación.',
            pageWidth / 2,
            footerY,
            { align: 'center' }
        );
        doc.text('LINHER Move by LINHER | linher.com.mx', pageWidth / 2, footerY + 4, { align: 'center' });

        doc.save(`Cotizacion_${quote.folio}.pdf`);
    }
};
