const { Pool } = require('pg');
require('dotenv').config();

console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0000',
    database: process.env.DB_NAME || 'medical_db',
    port: process.env.DB_PORT || 5432
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
}; 