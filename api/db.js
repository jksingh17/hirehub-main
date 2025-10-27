const mysql = require('mysql2/promise');

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DB_SSL_CA,
  DB_CONN_LIMIT,
} = process.env;

function createPool() {
  const config = {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: DB_CONN_LIMIT ? Number(DB_CONN_LIMIT) : 5,
    queueLimit: 0,
  };

  // If a CA cert is provided (base64 encoded), use it for TLS
  if (DB_SSL_CA) {
    try {
      config.ssl = {
        ca: Buffer.from(DB_SSL_CA, 'base64').toString('utf8'),
        rejectUnauthorized: true,
      };
    } catch (err) {
      console.error('Failed to parse DB_SSL_CA:', err.message);
    }
  }

  return mysql.createPool(config);
}

if (!global.__mysqlPool) {
  global.__mysqlPool = createPool();
}

module.exports = global.__mysqlPool;
