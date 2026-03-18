require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'casino',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+09:00'
});

// 헬퍼: 단일 행 조회
pool.getOne = async function(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
};

// 헬퍼: 다중 행 조회
pool.getAll = async function(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
};

// 헬퍼: INSERT/UPDATE/DELETE 실행
pool.run = async function(sql, params) {
  const [result] = await pool.query(sql, params);
  return result;
};

module.exports = pool;
