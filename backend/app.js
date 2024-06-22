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
    const [rows] = await db.query('SELECT * FROM procesos ORDER BY request_time_date DESC LIMIT 600');
    io.emit('latestProcesses', rows);
  } catch (error) {
    console.error('Error al emitir procesos:', error);
  }
}

setInterval(emitLatestProcesses, 5000); // Emitir cada 5 segundos

const PORT = process.env.PORT || 5000; // Asegúrate de que este puerto coincida con el que usas en el frontend

async function startServer() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();