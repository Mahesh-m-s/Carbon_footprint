require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── DB Connection Pool ────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'carbon_footprint_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection
pool.getConnection()
  .then(conn => { console.log('✅ MySQL Connected'); conn.release(); })
  .catch(err => console.error('❌ MySQL Connection Failed:', err.message));

// ─── DEPARTMENTS ───────────────────────────────────────────────────────────
app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/departments', async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: 'name and type required' });
  try {
    const [result] = await pool.query('INSERT INTO departments (name, type) VALUES (?, ?)', [name, type]);
    res.json({ success: true, id: result.insertId, message: 'Department added' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── DEVICES ──────────────────────────────────────────────────────────────
app.get('/api/devices', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, dep.name AS department_name
      FROM devices d
      LEFT JOIN departments dep ON d.department_id = dep.id
      ORDER BY d.device_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/devices', async (req, res) => {
  const { device_name, device_type, department_id, power_rating_watts, quantity } = req.body;
  if (!device_name || !device_type || !power_rating_watts)
    return res.status(400).json({ success: false, error: 'Required fields missing' });
  try {
    const [result] = await pool.query(
      'INSERT INTO devices (device_name, device_type, department_id, power_rating_watts, quantity) VALUES (?, ?, ?, ?, ?)',
      [device_name, device_type, department_id || null, power_rating_watts, quantity || 1]
    );
    res.json({ success: true, id: result.insertId, message: 'Device added' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── DEVICE USAGE ─────────────────────────────────────────────────────────
app.get('/api/device-usage', async (req, res) => {
  const { from, to, limit = 50 } = req.query;
  let query = `
    SELECT du.*, dev.device_name, dev.device_type, dev.power_rating_watts, dev.quantity,
           dep.name AS department,
           ROUND((dev.power_rating_watts * dev.quantity * du.hours_used / 1000) * ef.factor_value, 4) AS emission_kg
    FROM device_usage du
    JOIN devices dev ON du.device_id = dev.id
    LEFT JOIN departments dep ON dev.department_id = dep.id
    JOIN emission_factors ef ON ef.source_type = 'electricity'
    WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND du.usage_date >= ?'; params.push(from); }
  if (to)   { query += ' AND du.usage_date <= ?'; params.push(to); }
  query += ' ORDER BY du.usage_date DESC LIMIT ?';
  params.push(parseInt(limit));
  try {
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/device-usage', async (req, res) => {
  const { device_id, usage_date, hours_used, recorded_by, notes } = req.body;
  if (!device_id || !usage_date || !hours_used)
    return res.status(400).json({ success: false, error: 'device_id, usage_date, hours_used required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO device_usage (device_id, usage_date, hours_used, recorded_by, notes) VALUES (?, ?, ?, ?, ?)',
      [device_id, usage_date, hours_used, recorded_by || null, notes || null]
    );
    res.json({ success: true, id: result.insertId, message: 'Device usage logged' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/device-usage/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM device_usage WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── INTERNET CONSUMPTION ─────────────────────────────────────────────────
app.get('/api/internet', async (req, res) => {
  const { from, to, limit = 50 } = req.query;
  let query = `
    SELECT ic.*, d.name AS department,
           ROUND(ic.data_used_gb * ef.factor_value, 4) AS emission_kg
    FROM internet_consumption ic
    JOIN departments d ON ic.department_id = d.id
    JOIN emission_factors ef ON ef.source_type = 'internet_data'
    WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND ic.consumption_date >= ?'; params.push(from); }
  if (to)   { query += ' AND ic.consumption_date <= ?'; params.push(to); }
  query += ' ORDER BY ic.consumption_date DESC LIMIT ?';
  params.push(parseInt(limit));
  try {
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/internet', async (req, res) => {
  const { department_id, consumption_date, data_used_gb, num_users, connection_type, recorded_by } = req.body;
  if (!department_id || !consumption_date || !data_used_gb)
    return res.status(400).json({ success: false, error: 'Required fields missing' });
  try {
    const [result] = await pool.query(
      'INSERT INTO internet_consumption (department_id, consumption_date, data_used_gb, num_users, connection_type, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [department_id, consumption_date, data_used_gb, num_users || 1, connection_type || 'broadband', recorded_by || null]
    );
    res.json({ success: true, id: result.insertId, message: 'Internet usage logged' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/internet/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM internet_consumption WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── ELECTRICITY USAGE ────────────────────────────────────────────────────
app.get('/api/electricity', async (req, res) => {
  const { from, to, limit = 50 } = req.query;
  let query = `
    SELECT eu.*, d.name AS department,
           ROUND(eu.units_consumed_kwh * ef.factor_value, 4) AS emission_kg
    FROM electricity_usage eu
    JOIN departments d ON eu.department_id = d.id
    JOIN emission_factors ef ON ef.source_type = 'electricity'
    WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND eu.usage_date >= ?'; params.push(from); }
  if (to)   { query += ' AND eu.usage_date <= ?'; params.push(to); }
  query += ' ORDER BY eu.usage_date DESC LIMIT ?';
  params.push(parseInt(limit));
  try {
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/electricity', async (req, res) => {
  const { department_id, usage_date, units_consumed_kwh, meter_reading_start, meter_reading_end, recorded_by, notes } = req.body;
  if (!department_id || !usage_date || !units_consumed_kwh)
    return res.status(400).json({ success: false, error: 'Required fields missing' });
  try {
    const [result] = await pool.query(
      'INSERT INTO electricity_usage (department_id, usage_date, units_consumed_kwh, meter_reading_start, meter_reading_end, recorded_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [department_id, usage_date, units_consumed_kwh, meter_reading_start || null, meter_reading_end || null, recorded_by || null, notes || null]
    );
    res.json({ success: true, id: result.insertId, message: 'Electricity usage logged' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/electricity/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM electricity_usage WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── DASHBOARD / REPORTS ──────────────────────────────────────────────────
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [elec] = await pool.query(`
      SELECT 
        ROUND(SUM(eu.units_consumed_kwh * ef.factor_value), 2) AS total_emission_kg,
        ROUND(SUM(eu.units_consumed_kwh), 2) AS total_kwh
      FROM electricity_usage eu
      JOIN emission_factors ef ON ef.source_type = 'electricity'
      WHERE eu.usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const [inet] = await pool.query(`
      SELECT 
        ROUND(SUM(ic.data_used_gb * ef.factor_value), 2) AS total_emission_kg,
        ROUND(SUM(ic.data_used_gb), 2) AS total_gb
      FROM internet_consumption ic
      JOIN emission_factors ef ON ef.source_type = 'internet_data'
      WHERE ic.consumption_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const [dev] = await pool.query(`
      SELECT 
        ROUND(SUM((d.power_rating_watts * d.quantity * du.hours_used / 1000) * ef.factor_value), 2) AS total_emission_kg,
        ROUND(SUM(du.hours_used), 2) AS total_hours
      FROM device_usage du
      JOIN devices d ON du.device_id = d.id
      JOIN emission_factors ef ON ef.source_type = 'electricity'
      WHERE du.usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const [trend] = await pool.query(`
      SELECT 
        eu.usage_date AS date,
        ROUND(SUM(eu.units_consumed_kwh * ef.factor_value), 2) AS elec_emission,
        0 AS inet_emission
      FROM electricity_usage eu
      JOIN emission_factors ef ON ef.source_type = 'electricity'
      WHERE eu.usage_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY eu.usage_date
      ORDER BY eu.usage_date
    `);

    const [byDept] = await pool.query(`
      SELECT 
        d.name AS department,
        ROUND(SUM(eu.units_consumed_kwh * ef.factor_value), 2) AS emission_kg
      FROM electricity_usage eu
      JOIN departments d ON eu.department_id = d.id
      JOIN emission_factors ef ON ef.source_type = 'electricity'
      WHERE eu.usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY d.name
      ORDER BY emission_kg DESC
    `);

    res.json({
      success: true,
      summary: {
        electricity: elec[0],
        internet: inet[0],
        devices: dev[0],
        total_kg: (
          (parseFloat(elec[0].total_emission_kg) || 0) +
          (parseFloat(inet[0].total_emission_kg) || 0) +
          (parseFloat(dev[0].total_emission_kg) || 0)
        ).toFixed(2)
      },
      trend,
      byDept
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/dashboard/monthly', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(eu.usage_date, '%Y-%m') AS month,
        ROUND(SUM(eu.units_consumed_kwh * ef.factor_value), 2) AS emission_kg
      FROM electricity_usage eu
      JOIN emission_factors ef ON ef.source_type = 'electricity'
      WHERE eu.usage_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(eu.usage_date, '%Y-%m')
      ORDER BY month
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.listen(PORT, () => {
  console.log(`🌿 Carbon Footprint Server running at http://localhost:${PORT}`);
});


app.get('/api/departments', async (req, res) => {
  console.log("👉 API HIT: /api/departments");

  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name');

    console.log("📦 DB RESULT:", rows);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});