import { BaseModel } from './BaseModel.js';

const normalizeReportType = (rawType) => (
    rawType === 'services' || rawType === 'logistics' ? rawType : ''
);

const toInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const operatorAttributionExpression = (alias = 'q') => (
    `CASE WHEN ${alias}.status = 'completada' THEN COALESCE(${alias}.completed_by_user_id, ${alias}.user_id) ELSE COALESCE(${alias}.assigned_user_id, ${alias}.user_id) END`
);

export class ReportModel extends BaseModel {
    constructor(db) {
        super('quotations', db);
    }

    normalizeFilters(filters = {}) {
        const limit = Math.max(1, Math.min(500, toInt(filters.limit, 20)));
        const offset = Math.max(0, toInt(filters.offset, 0));
        const exportLimit = Math.max(1, Math.min(20000, toInt(filters.limit, 5000)));

        return {
            date_from: filters.date_from || null,
            date_to: filters.date_to || null,
            status: filters.status || '',
            quote_type: normalizeReportType(filters.quote_type),
            operator_id: filters.operator_id ? toInt(filters.operator_id, 0) : 0,
            limit,
            offset,
            exportLimit
        };
    }

    buildFilterClause(filters = {}, alias = 'q') {
        const clauses = [];
        const params = [];

        if (filters.date_from) {
            clauses.push(`${alias}.created_at >= ?`);
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            clauses.push(`${alias}.created_at <= ?`);
            params.push(`${filters.date_to} 23:59:59`);
        }

        if (filters.status) {
            clauses.push(`${alias}.status = ?`);
            params.push(filters.status);
        }

        if (filters.quote_type === 'services') {
            clauses.push('qst.quotation_id IS NOT NULL');
        } else if (filters.quote_type === 'logistics') {
            clauses.push('qst.quotation_id IS NULL');
        }

        if (filters.operator_id) {
            clauses.push(`${operatorAttributionExpression(alias)} = ?`);
            params.push(filters.operator_id);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        return { where, params };
    }

    async getOperationalReport(rawFilters = {}) {
        const filters = this.normalizeFilters(rawFilters);
        const { where, params } = this.buildFilterClause(filters, 'q');

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const dataQuery = `
            SELECT
                q.id,
                q.folio,
                q.status,
                q.created_at,
                u.name AS operator_name,
                qr.origin_address,
                qr.destination_address,
                qr.distance_total,
                qr.time_total,
                COALESCE(qc.total, 0) AS total,
                CASE WHEN qst.quotation_id IS NULL THEN 'logistics' ELSE 'services' END AS quote_type
            FROM quotations q
            LEFT JOIN users u ON u.id = ${operatorAttributionExpression('q')}
            LEFT JOIN quotation_routes qr ON qr.quotation_id = q.id
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const kpiQuery = `
            SELECT
                COUNT(*) AS total_quotes,
                SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) AS completed_quotes,
                SUM(CASE WHEN q.status = 'pendiente' THEN 1 ELSE 0 END) AS pending_quotes,
                COALESCE(SUM(CASE WHEN q.status = 'completada' THEN qc.total ELSE 0 END), 0) AS revenue
            FROM quotations q
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const byStatusQuery = `
            SELECT q.status, COUNT(*) AS count
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            GROUP BY q.status
        `;

        const byTypeQuery = `
            SELECT
                CASE WHEN qst.quotation_id IS NULL THEN 'logistics' ELSE 'services' END AS quote_type,
                COUNT(*) AS count
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            GROUP BY quote_type
        `;

        const trendQuery = `
            SELECT DATE(q.created_at) AS day, COUNT(*) AS count
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            GROUP BY DATE(q.created_at)
            ORDER BY day ASC
        `;

        const [[countRows], [dataRows], [kpiRows], [byStatusRows], [byTypeRows], [trendRows]] = await Promise.all([
            this.db.query(countQuery, params),
            this.db.query(dataQuery, [...params, filters.limit, filters.offset]),
            this.db.query(kpiQuery, params),
            this.db.query(byStatusQuery, params),
            this.db.query(byTypeQuery, params),
            this.db.query(trendQuery, params)
        ]);

        const total = countRows[0]?.total || 0;
        const kpis = kpiRows[0] || {};

        return {
            kpis: {
                total_quotes: Number(kpis.total_quotes || 0),
                completed_quotes: Number(kpis.completed_quotes || 0),
                pending_quotes: Number(kpis.pending_quotes || 0),
                revenue: Number(kpis.revenue || 0)
            },
            by_status: byStatusRows,
            by_type: byTypeRows,
            trend_by_day: trendRows,
            data: dataRows,
            pagination: {
                total,
                limit: filters.limit,
                pages: Math.max(1, Math.ceil(total / filters.limit)),
                current_page: Math.floor(filters.offset / filters.limit) + 1
            }
        };
    }

    async getOperatorsReport(rawFilters = {}) {
        const filters = this.normalizeFilters(rawFilters);
        const { where, params } = this.buildFilterClause(filters, 'q');

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT ${operatorAttributionExpression('q')} AS operator_id
                FROM quotations q
                LEFT JOIN (
                    SELECT DISTINCT quotation_id
                    FROM quotation_services
                ) qst ON qst.quotation_id = q.id
                ${where}
                GROUP BY ${operatorAttributionExpression('q')}
            ) grouped
        `;

        const dataQuery = `
            SELECT
                u.id AS operator_id,
                u.name AS operator_name,
                COUNT(q.id) AS total_quotes,
                SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) AS completed_quotes,
                ROUND(
                    (SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) / NULLIF(COUNT(q.id), 0)) * 100,
                    1
                ) AS success_rate,
                COALESCE(SUM(CASE WHEN q.status = 'completada' THEN qc.total ELSE 0 END), 0) AS revenue
            FROM quotations q
            JOIN users u ON u.id = ${operatorAttributionExpression('q')}
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            GROUP BY u.id, u.name
            ORDER BY revenue DESC, total_quotes DESC
            LIMIT ? OFFSET ?
        `;

        const totalsQuery = `
            SELECT
                COUNT(DISTINCT ${operatorAttributionExpression('q')}) AS total_operators,
                COUNT(*) AS total_quotes,
                SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) AS total_completed,
                COALESCE(SUM(CASE WHEN q.status = 'completada' THEN qc.total ELSE 0 END), 0) AS total_revenue
            FROM quotations q
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const [[countRows], [dataRows], [totalsRows]] = await Promise.all([
            this.db.query(countQuery, params),
            this.db.query(dataQuery, [...params, filters.limit, filters.offset]),
            this.db.query(totalsQuery, params)
        ]);

        const total = countRows[0]?.total || 0;
        const totals = totalsRows[0] || {};

        return {
            totals: {
                total_operators: Number(totals.total_operators || 0),
                total_quotes: Number(totals.total_quotes || 0),
                total_completed: Number(totals.total_completed || 0),
                total_revenue: Number(totals.total_revenue || 0)
            },
            data: dataRows,
            pagination: {
                total,
                limit: filters.limit,
                pages: Math.max(1, Math.ceil(total / filters.limit)),
                current_page: Math.floor(filters.offset / filters.limit) + 1
            }
        };
    }

    async getFinancialReport(rawFilters = {}) {
        const filters = this.normalizeFilters(rawFilters);
        const { where, params } = this.buildFilterClause(filters, 'q');

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const dataQuery = `
            SELECT
                q.id,
                q.folio,
                q.created_at,
                q.status,
                u.name AS operator_name,
                COALESCE(qc.subtotal, 0) AS subtotal,
                COALESCE(qc.iva, 0) AS iva,
                COALESCE(qc.total, 0) AS total,
                COALESCE(qc.toll_cost, 0) AS toll_cost,
                COALESCE(qc.gas_cost, 0) AS gas_cost,
                COALESCE(qc.lodging_cost, 0) AS lodging_cost,
                COALESCE(qc.meal_cost, 0) AS meal_cost,
                COALESCE(service_totals.services_cost, 0) AS services_cost,
                CASE WHEN qst.quotation_id IS NULL THEN 'logistics' ELSE 'services' END AS quote_type
            FROM quotations q
            LEFT JOIN users u ON u.id = ${operatorAttributionExpression('q')}
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT quotation_id, SUM(cost) AS services_cost
                FROM quotation_services
                GROUP BY quotation_id
            ) service_totals ON service_totals.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const kpiQuery = `
            SELECT
                COUNT(*) AS total_quotes,
                COALESCE(SUM(qc.subtotal), 0) AS subtotal,
                COALESCE(SUM(qc.iva), 0) AS iva,
                COALESCE(SUM(qc.total), 0) AS revenue,
                COALESCE(AVG(qc.total), 0) AS avg_ticket
            FROM quotations q
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const breakdownQuery = `
            SELECT
                COALESCE(SUM(qc.toll_cost), 0) AS toll_cost,
                COALESCE(SUM(qc.gas_cost), 0) AS gas_cost,
                COALESCE(SUM(qc.lodging_cost), 0) AS lodging_cost,
                COALESCE(SUM(qc.meal_cost), 0) AS meal_cost,
                COALESCE(SUM(service_totals.services_cost), 0) AS services_cost
            FROM quotations q
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT quotation_id, SUM(cost) AS services_cost
                FROM quotation_services
                GROUP BY quotation_id
            ) service_totals ON service_totals.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const topQuotesQuery = `
            SELECT
                q.id,
                q.folio,
                q.created_at,
                u.name AS operator_name,
                COALESCE(qc.total, 0) AS total
            FROM quotations q
            LEFT JOIN users u ON u.id = ${operatorAttributionExpression('q')}
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            ORDER BY qc.total DESC
            LIMIT 5
        `;

        const [[countRows], [dataRows], [kpiRows], [breakdownRows], [topQuoteRows]] = await Promise.all([
            this.db.query(countQuery, params),
            this.db.query(dataQuery, [...params, filters.limit, filters.offset]),
            this.db.query(kpiQuery, params),
            this.db.query(breakdownQuery, params),
            this.db.query(topQuotesQuery, params)
        ]);

        const total = countRows[0]?.total || 0;
        const kpis = kpiRows[0] || {};
        const costBreakdown = breakdownRows[0] || {};

        return {
            kpis: {
                total_quotes: Number(kpis.total_quotes || 0),
                subtotal: Number(kpis.subtotal || 0),
                iva: Number(kpis.iva || 0),
                revenue: Number(kpis.revenue || 0),
                avg_ticket: Number(kpis.avg_ticket || 0)
            },
            cost_breakdown: {
                toll_cost: Number(costBreakdown.toll_cost || 0),
                gas_cost: Number(costBreakdown.gas_cost || 0),
                lodging_cost: Number(costBreakdown.lodging_cost || 0),
                meal_cost: Number(costBreakdown.meal_cost || 0),
                services_cost: Number(costBreakdown.services_cost || 0)
            },
            top_quotes: topQuoteRows,
            data: dataRows,
            pagination: {
                total,
                limit: filters.limit,
                pages: Math.max(1, Math.ceil(total / filters.limit)),
                current_page: Math.floor(filters.offset / filters.limit) + 1
            }
        };
    }

    normalizeExportFilters(rawFilters = {}) {
        const normalized = this.normalizeFilters({
            ...rawFilters,
            limit: 1,
            offset: 0
        });

        return {
            date_from: normalized.date_from,
            date_to: normalized.date_to,
            status: normalized.status,
            quote_type: normalized.quote_type,
            operator_id: normalized.operator_id
        };
    }

    normalizeExportBatch(rawBatch = {}) {
        return {
            limit: Math.max(1, Math.min(10000, toInt(rawBatch.limit, 5000))),
            offset: Math.max(0, toInt(rawBatch.offset, 0))
        };
    }

    async getExportTotalCount(reportType, rawFilters = {}) {
        const filters = this.normalizeExportFilters(rawFilters);
        const { where, params } = this.buildFilterClause(filters, 'q');

        if (reportType === 'operators') {
            const countQuery = `
                SELECT COUNT(*) AS total
                FROM (
                    SELECT ${operatorAttributionExpression('q')} AS operator_id
                    FROM quotations q
                    LEFT JOIN (
                        SELECT DISTINCT quotation_id
                        FROM quotation_services
                    ) qst ON qst.quotation_id = q.id
                    ${where}
                    GROUP BY ${operatorAttributionExpression('q')}
                ) grouped
            `;

            const [rows] = await this.db.query(countQuery, params);
            return Number(rows[0]?.total || 0);
        }

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM quotations q
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
        `;

        const [rows] = await this.db.query(countQuery, params);
        return Number(rows[0]?.total || 0);
    }

    async getExportBatch(reportType, rawFilters = {}, rawBatch = {}) {
        const filters = this.normalizeExportFilters(rawFilters);
        const { where, params } = this.buildFilterClause(filters, 'q');
        const batch = this.normalizeExportBatch(rawBatch);

        if (reportType === 'operators') {
            const dataQuery = `
                SELECT
                    u.id AS operator_id,
                    u.name AS operator_name,
                    COUNT(q.id) AS total_quotes,
                    SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) AS completed_quotes,
                    ROUND(
                        (SUM(CASE WHEN q.status = 'completada' THEN 1 ELSE 0 END) / NULLIF(COUNT(q.id), 0)) * 100,
                        1
                    ) AS success_rate,
                    COALESCE(SUM(CASE WHEN q.status = 'completada' THEN qc.total ELSE 0 END), 0) AS revenue
                FROM quotations q
                JOIN users u ON u.id = ${operatorAttributionExpression('q')}
                LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
                LEFT JOIN (
                    SELECT DISTINCT quotation_id
                    FROM quotation_services
                ) qst ON qst.quotation_id = q.id
                ${where}
                GROUP BY u.id, u.name
                ORDER BY revenue DESC, total_quotes DESC
                LIMIT ? OFFSET ?
            `;

            const [rows] = await this.db.query(dataQuery, [...params, batch.limit, batch.offset]);
            return rows;
        }

        if (reportType === 'financial') {
            const dataQuery = `
                SELECT
                    q.id,
                    q.folio,
                    q.created_at,
                    q.status,
                    u.name AS operator_name,
                    COALESCE(qc.subtotal, 0) AS subtotal,
                    COALESCE(qc.iva, 0) AS iva,
                    COALESCE(qc.total, 0) AS total,
                    COALESCE(qc.toll_cost, 0) AS toll_cost,
                    COALESCE(qc.gas_cost, 0) AS gas_cost,
                    COALESCE(qc.lodging_cost, 0) AS lodging_cost,
                    COALESCE(qc.meal_cost, 0) AS meal_cost,
                    COALESCE(service_totals.services_cost, 0) AS services_cost,
                    CASE WHEN qst.quotation_id IS NULL THEN 'logistics' ELSE 'services' END AS quote_type
                FROM quotations q
                LEFT JOIN users u ON u.id = ${operatorAttributionExpression('q')}
                LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
                LEFT JOIN (
                    SELECT quotation_id, SUM(cost) AS services_cost
                    FROM quotation_services
                    GROUP BY quotation_id
                ) service_totals ON service_totals.quotation_id = q.id
                LEFT JOIN (
                    SELECT DISTINCT quotation_id
                    FROM quotation_services
                ) qst ON qst.quotation_id = q.id
                ${where}
                ORDER BY q.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const [rows] = await this.db.query(dataQuery, [...params, batch.limit, batch.offset]);
            return rows;
        }

        const dataQuery = `
            SELECT
                q.id,
                q.folio,
                q.status,
                q.created_at,
                u.name AS operator_name,
                qr.origin_address,
                qr.destination_address,
                qr.distance_total,
                qr.time_total,
                COALESCE(qc.total, 0) AS total,
                CASE WHEN qst.quotation_id IS NULL THEN 'logistics' ELSE 'services' END AS quote_type
            FROM quotations q
            LEFT JOIN users u ON u.id = ${operatorAttributionExpression('q')}
            LEFT JOIN quotation_routes qr ON qr.quotation_id = q.id
            LEFT JOIN quotation_costs qc ON qc.quotation_id = q.id
            LEFT JOIN (
                SELECT DISTINCT quotation_id
                FROM quotation_services
            ) qst ON qst.quotation_id = q.id
            ${where}
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await this.db.query(dataQuery, [...params, batch.limit, batch.offset]);
        return rows;
    }
}
