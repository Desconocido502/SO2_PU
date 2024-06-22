-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS processBD;

-- Usar la base de datos
USE processBD;

-- Crear la tabla para almacenar la data de los procesos
CREATE TABLE IF NOT EXISTS process (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pid INT NOT NULL,
    process_name VARCHAR(255) NOT NULL,
    call_ VARCHAR(50) NOT NULL,
    segment_size INT NOT NULL,
    request_time_date VARCHAR(100),
    mmap_total BIGINT DEFAULT 0,
    munmap_total BIGINT DEFAULT 0
);

CREATE INDEX idx_pid ON process(pid);