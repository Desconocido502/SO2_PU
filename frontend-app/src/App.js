import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import io from "socket.io-client";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8",
  "#82ca9d", "#ffc658", "#8dd1e1", "#a4de6c", "#d0ed57",
];

function App() {
  const [topMemoryProcesses, setTopMemoryProcesses] = useState([]);
  const [latestProcesses, setLatestProcesses] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:5000");
    
    socket.on("topMemoryProcesses", (data) => {
      console.log("topMemoryProcess: ", data);
      setTopMemoryProcesses(data);
    });

    socket.on("latestProcesses", (data) => {
      setLatestProcesses(data);
    });

    return () => socket.disconnect();
  }, []);

  const bytesToMB = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const formattedData = topMemoryProcesses.map((process) => ({
    ...process,
    memoria: Number(process.memoria)
  }));

  return (
    <div className="App">
      <h1>Monitor de Memoria</h1>
      <div className="dashboard-container">
        <div className="process-table">
          <h2>Top Procesos por Uso de Memoria</h2>
          <table>
            <thead>
              <tr>
                <th>PID</th>
                <th>Proceso</th>
                <th>% de Memoria</th>
              </tr>
            </thead>
            <tbody>
              {topMemoryProcesses.map((process, index) => (
                <tr key={index}>
                  <td>{process.pid}</td>
                  <td>{process.nombre}</td>
                  <td>{process.porcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pie-chart">
          <h2>Distribución de Memoria por Proceso</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={formattedData}
                dataKey="memoria"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ nombre, memoria }) => `${nombre} ${memoria}%`}
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="calls-table">
        <h2>Últimos 50 Procesos</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>PID</th>
              <th>Proceso</th>
              <th>Llamada</th>
              <th>Tamaño del Segmento</th>
              <th>Fecha de Petición</th>
            </tr>
          </thead>
          <tbody>
            {latestProcesses.map((process, index) => (
              <tr key={index}>
                <td>{process.id}</td>
                <td>{process.pid}</td>
                <td>{process.process_name}</td>
                <td>{process.call_}</td>
                <td>{bytesToMB(process.segment_size)} MB</td>
                <td>{process.request_time_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
