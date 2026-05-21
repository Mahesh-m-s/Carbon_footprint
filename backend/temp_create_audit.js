require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'carbon_footprint_db'
  });

  try {
    console.log('Connecting to database...');
    const [rows] = await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INT NOT NULL,
        performed_by VARCHAR(100) DEFAULT 'System',
        action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `);
    console.log('Table audit_logs checked/created successfully!');
  } catch (err) {
    console.error('Error creating audit_logs table:', err);
  } finally {
    await connection.end();
  }
}

run();
