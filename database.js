require('dotenv').config(); // Add this at the top

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection()
  .then(conn => {
    console.log('Connected to Railway MySQL database.');
    conn.release();
  })
  .catch(err => {
    console.error('MySQL Connection failed:', err);
  });

module.exports = pool;
