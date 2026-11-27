const oracledb = require('oracledb');
require('dotenv').config();

// Kembalikan hasil query dalam format objek JSON ({ kolom: nilai }) bukan array mentah
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// Otomatis commit untuk query DML standar (kecuali di dalam Stored Procedure yang mengatur transaksi sendiri)
oracledb.autoCommit = true;

async function initializePool() {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('Oracle Database connection pool berhasil diinisialisasi.');
  } catch (err) {
    console.error('Gagal membuat Oracle connection pool:', err);
    throw err;
  }
}

async function closePool() {
  try {
    await oracledb.getPool().close(10);
    console.log('Oracle Database connection pool ditutup.');
  } catch (err) {
    console.error('Gagal menutup connection pool:', err);
  }
}

function getConnection() {
  return oracledb.getConnection();
}

module.exports = {
  initializePool,
  closePool,
  getConnection,
  oracledb
};