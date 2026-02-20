export class BaseModel {
    constructor(tableName, db) {
        this.tableName = tableName;
        this.db = db;
    }

    async getAll(orderBy = 'created_at DESC') {
        const [rows] = await this.db.query(`SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`);
        return rows;
    }

    async getById(id) {
        const [rows] = await this.db.query(`SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    async delete(id) {
        const [result] = await this.db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
        return result.affectedRows > 0;
    }
}
