const express = require('express');
const mysql = require('mysql2/promise');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Habilitar CORS para Express
app.use(cors());

// Configurar Socket.IO con opciones CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Ajusta esto a la URL de tu frontend
    methods: ["GET", "POST"]
  }
});

const dbConfig = {
  host: process.env.DB_HOST || "172.17.0.2",
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'my-secret-pw',
  database: process.env.DB_NAME || 'processBD',
};

let db;

async function initDb() {
  db = await mysql.createConnection(dbConfig);
  console.log('Conectado a la base de datos');
}

app.get('/processes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM procesos ORDER BY request_time_date DESC LIMIT 600');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener procesos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

async function emitLatestProcesses() {
  try {
    const [rows] = await db.query('SELECT * FROM procesos ORDER BY request_time_date DESC LIMIT 50');
    io.emit('latestProcesses', rows);
  } catch (error) {
    console.error('Error al emitir procesos:', error);
  }
}

async function emitGetTopMemoryProcesses() {
  try {
    // Obtener la memoria total
    const [totalMemoryResult] = await db.query('SELECT SUM(segment_size) AS total_memory FROM procesos');
    const totalMemory = totalMemoryResult[0].total_memory;

    // Obtener los procesos con más memoria utilizada
    const [topMemoryRows] = await db.query(`
      SELECT
        pid,
        process_name,
        (SUM(CASE WHEN call = 'mmap2' THEN segment_size ELSE 0 END) - SUM(CASE WHEN call = 'munmap' THEN segment_size ELSE 0 END)) AS memory
      FROM procesos
      GROUP BY pid, process_name
      HAVING memory > 0
      ORDER BY memory DESC
      LIMIT 10
    `);

    // Calcular el porcentaje de memoria
    const topProcesosConPorcentaje = topMemoryRows.map(proceso => {
      const memoria = proceso.memory;
      const porcentaje = totalMemory ? (memoria / totalMemory * 100).toFixed(2) : 0;
      return {
        pid: proceso.pid,
        nombre: proceso.process_name,
        memoria: memoria,
        porcentaje: porcentaje
      };
    });

    io.emit('topMemoryProcesses', topProcesosConPorcentaje);
  } catch (error) {
    console.error('Error al obtener procesos:', error);
  }
}

setInterval(emitLatestProcesses, 5000); // Emitir cada 5 segundos
setInterval(emitGetTopMemoryProcesses, 5000); // Emitir cada 5 segundos

const PORT = process.env.PORT || 5000; // Asegúrate de que este puerto coincida con el que usas en el frontend

async function startServer() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();