import { ReportModel } from '../models/ReportModel.js';
import { SystemLogger } from '../utils/Logger.js';
import { buildRequestContext, getOperatorIdFromRequest, logHandledError, sanitizeForLog } from '../utils/RequestContext.js';
import { once } from 'node:events';

const ALLOWED_REPORT_TYPES = new Set(['operational', 'operators', 'financial']);
const EXPORT_BATCH_SIZE = 5000;
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const EXPORT_SECURITY_MAX_ROWS = parsePositiveInt(process.env.REPORT_EXPORT_MAX_ROWS, 200000);

const normalizeReportFilters = (query = {}) => {
    const reportType = ALLOWED_REPORT_TYPES.has(query.report) ? query.report : 'operational';

    return {
        reportType,
        date_from: query.date_from || '',
        date_to: query.date_to || '',
        status: query.status || '',
        quote_type: query.quote_type || '',
        operator_id: query.operator_id || '',
        limit: query.limit || '',
        offset: query.offset || ''
    };
};

const csvEscape = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    const normalized = String(value);
    if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
};

const writeChunk = async (res, chunk) => {
    if (res.writableEnded || res.destroyed) {
        return false;
    }

    const canContinue = res.write(chunk);
    if (!canContinue) {
        await once(res, 'drain');
    }

    return !(res.writableEnded || res.destroyed);
};

export const ReportsController = (db) => {
    const reportModel = new ReportModel(db);
    const logger = new SystemLogger(db);

    return {
        operational: async (req, res) => {
            try {
                const report = await reportModel.getOperationalReport(req.query);
                return res.json(report);
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'REPORT_OPERATIONAL_FETCH_ERROR',
                    error
                });
                return res.status(500).json({ message: 'Error al cargar reporte operativo' });
            }
        },
        operators: async (req, res) => {
            try {
                const report = await reportModel.getOperatorsReport(req.query);
                return res.json(report);
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'REPORT_OPERATORS_FETCH_ERROR',
                    error
                });
                return res.status(500).json({ message: 'Error al cargar reporte por operador' });
            }
        },
        financial: async (req, res) => {
            try {
                const report = await reportModel.getFinancialReport(req.query);
                return res.json(report);
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'REPORT_FINANCIAL_FETCH_ERROR',
                    error
                });
                return res.status(500).json({ message: 'Error al cargar reporte financiero' });
            }
        },
        exportCsv: async (req, res) => {
            try {
                const { reportType, ...filters } = normalizeReportFilters(req.query);
                const totalRows = await reportModel.getExportTotalCount(reportType, filters);

                if (totalRows > EXPORT_SECURITY_MAX_ROWS) {
                    await logger.business(
                        getOperatorIdFromRequest(req) || req.authUser?.id || null,
                        'EXPORT_REPORT_CSV_BLOCKED_LIMIT',
                        {
                            report_type: reportType,
                            filters: sanitizeForLog(filters),
                            total_rows: totalRows,
                            max_rows: EXPORT_SECURITY_MAX_ROWS,
                            ...buildRequestContext(req)
                        },
                        req.ip
                    );

                    return res.status(422).json({
                        message: `El reporte excede el l\u00edmite de exportaci\u00f3n (${EXPORT_SECURITY_MAX_ROWS.toLocaleString('es-MX')} filas). Aplica filtros para reducir el resultado.`
                    });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `report-${reportType}-${timestamp}.csv`;
                const operatorId = getOperatorIdFromRequest(req) || req.authUser?.id || null;
                let exportedRows = 0;
                let offset = 0;
                let headers = null;

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                await writeChunk(res, '\uFEFF');

                while (offset < totalRows) {
                    const batchRows = await reportModel.getExportBatch(
                        reportType,
                        filters,
                        { limit: EXPORT_BATCH_SIZE, offset }
                    );

                    if (!batchRows.length) {
                        break;
                    }

                    if (!headers) {
                        headers = Object.keys(batchRows[0]);
                        const headerLine = `${headers.join(',')}\n`;
                        const wroteHeader = await writeChunk(res, headerLine);

                        if (!wroteHeader) {
                            break;
                        }
                    }

                    for (const row of batchRows) {
                        const line = `${headers.map((header) => csvEscape(row[header])).join(',')}\n`;
                        const wroteLine = await writeChunk(res, line);

                        if (!wroteLine) {
                            break;
                        }

                        exportedRows += 1;
                    }

                    offset += batchRows.length;

                    if (res.writableEnded || res.destroyed) {
                        break;
                    }
                }

                if (!res.writableEnded && !res.destroyed) {
                    res.end();
                }

                await logger.business(
                    operatorId,
                    'EXPORT_REPORT_CSV',
                    {
                        report_type: reportType,
                        filters: sanitizeForLog(filters),
                        rows: exportedRows,
                        total_rows: totalRows,
                        ...buildRequestContext(req)
                    },
                    req.ip
                );

                return undefined;
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'REPORT_EXPORT_ERROR',
                    error
                });

                if (!res.headersSent) {
                    return res.status(500).json({ message: 'Error al exportar reporte' });
                }

                if (!res.writableEnded && !res.destroyed) {
                    res.end();
                }

                return undefined;
            }
        }
    };
};
