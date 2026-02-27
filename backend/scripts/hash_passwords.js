import pool from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function migrate() {
    console.log('Starting password hashing migration...');
    try {
        const [users] = await pool.query('SELECT id, password FROM users');
        let count = 0;

        for (const user of users) {
            // Check if already hashed
            if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(user.password, salt);

                await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
                count++;
                console.log(`Hashed password for user ID: ${user.id}`);
            }
        }

        console.log(`Migration complete. Hashed ${count} passwords.`);
    } catch (error) {
        console.error('Migration failed:', error);
    } process.exit(0);
}

migrate();
