const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializePool, closePool, oracledb } = require('./config/db');
const scheduleRoutes = require('./routes/scheduleRoutes');
const coreRoutes = require('./routes/coreRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint cek kesehatan server & koneksi Oracle
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ShiftFlow Oracle Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Daftarkan seluruh route API
app.use('/api', scheduleRoutes);
app.use('/api', coreRoutes);

async function startServer() {
  try {
    await initializePool();
    // Simpan pool ke app.locals agar dapat diakses oleh route milik rekan tim
    app.locals.dbPool = oracledb.getPool();

    const server = app.listen(PORT, () => {
      console.log(`Server backend ShiftFlow berjalan di http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log('\nMenutup server dan koneksi Oracle...');
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Server gagal dijalankan karena koneksi database bermasalah:', err);
    process.exit(1);
  }
}

startServer();