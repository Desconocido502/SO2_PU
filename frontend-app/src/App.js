import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import io from "socket.io-client";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
];

function App() {
  const [groupedProcesses, setGroupedProcesses] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:5000");
    socket.on("latestProcesses", (data) => {
      const grouped = groupProcesses(data);
      setGroupedProcesses(grouped);
    });

    return () => socket.disconnect();
  }, []);

  const bytesToMB = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const groupProcesses = (data) => {
    const grouped = data.reduce((acc, process) => {
      if (!acc[process.pid]) {
        acc[process.pid] = {
          pid: process.pid,
          process_name: process.process_name,
          mmap_total: 0,
          munmap_total: 0,
          last_call: process.call_,
          last_size: process.segment_size,
          last_timestamp: process.request_time_date,
        };
      }
      if (process.call_ === "mmap" || process.call_ === "mmap2") {
        acc[process.pid].mmap_total += process.segment_size;
      } else if (process.call_ === "munmap") {
        acc[process.pid].munmap_total += process.segment_size;
      }
      acc[process.pid].last_call = process.call_;
      acc[process.pid].last_size = process.segment_size;
      acc[process.pid].last_timestamp = process.request_time_date;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const calculateMemoryUsage = (process) => {
    return Math.max(0, process.mmap_total - process.munmap_total);
  };

  const totalMemory = groupedProcesses.reduce(
    (sum, process) => sum + calculateMemoryUsage(process),
    0
  );

  const pieData = groupedProcesses
    .map((process) => ({
      name: process.process_name,
      value: calculateMemoryUsage(process),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 9);

  if (groupedProcesses.length > 9) {
    const otherValue = groupedProcesses
      .slice(9)
      .reduce((sum, process) => sum + calculateMemoryUsage(process), 0);
    pieData.push({ name: "Otros", value: otherValue });
  }

  return (
    <div className="App">
      <h1>Monitor de Memoria</h1>
      <div className="dashboard-container">
        <div className="calls-table">
          <h2>Procesos y Uso de Memoria</h2>
          <table>
            <thead>
              <tr>
                <th>PID</th>
                <th>Proceso</th>
                <th>Última Llamada</th>
                <th>Último Tamaño</th>
                <th>Memoria Total</th>
                <th>% de Memoria</th>
                <th>Último Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {groupedProcesses.map((process, index) => (
                <tr key={`${process.pid}-${index}`}>
                  <td>{process.pid}</td>
                  <td>{process.process_name}</td>
                  <td>{process.last_call}</td>
                  <td>{bytesToMB(process.last_size)} MB</td>
                  <td>{bytesToMB(calculateMemoryUsage(process))} MB</td>
                  <td>
                    {(
                      (calculateMemoryUsage(process) / totalMemory) *
                      100
                    ).toFixed(2)}
                    %
                  </td>
                  <td>{process.last_timestamp}</td>
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
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
