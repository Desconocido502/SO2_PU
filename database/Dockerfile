# Utilizamos la imagen oficial de MySQL
FROM mysql:latest


# Copiamos el script de inicialización a la carpeta de entrada del contenedor
COPY ./db_init.sql /docker-entrypoint-initdb.d/

# Exponemos el puerto por defecto de MySQL
EXPOSE 3306