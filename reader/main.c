#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <errno.h>
#include <mysql/mysql.h>

#define SYSTEMTAP_SCRIPT "./trace_reader.stp"
#define BUFFER_SIZE 1024

// Configuración de la base de datos
#define DB_HOST "172.17.0.2"
#define DB_USER "root"
#define DB_PASS "my-secret-pw"
#define DB_NAME "processBD"

MYSQL *conn;

void init_database() {
    conn = mysql_init(NULL);
    if (conn == NULL) {
        fprintf(stderr, "Error al inicializar MySQL: %s\n", mysql_error(conn));
        exit(1);
    }
    if (mysql_real_connect(conn, DB_HOST, DB_USER, DB_PASS, DB_NAME, 0, NULL, 0) == NULL) {
        fprintf(stderr, "Error al conectar a la base de datos: %s\n", mysql_error(conn));
        mysql_close(conn);
        exit(1);
    }
    printf("Conexión exitosa a la base de datos\n");
}

void insert_into_database(const char* timestamp, int pid, const char* process, const char* syscall, unsigned long size) {
    char query[1024];
    snprintf(query, sizeof(query), 
             "INSERT INTO procesos (pid, process_name, call_, segment_size, request_time_date) "
             "VALUES (%d, '%s', '%s', %lu, '%s')",
             pid, process, syscall, size, timestamp);

    if (mysql_query(conn, query)) {
        fprintf(stderr, "Error al insertar en la base de datos: %s\n", mysql_error(conn));
    }
}

void process_line(char* line) {
    char timestamp[64];
    int pid;
    char process[256];
    char syscall[10];
    unsigned long size;

    line[strcspn(line, "\n")] = 0;

    sscanf(line, "%63[^,], %d, %255[^,], %9[^,], %lu",
           timestamp, &pid, process, syscall, &size);

    printf("Timestamp: %s\n", timestamp);
    printf("PID: %d\n", pid);
    printf("Process: %s\n", process);
    printf("Syscall: %s\n", syscall);
    printf("Size: %lu\n", size);
    printf("--------------------\n");

    // Insertar en la base de datos
    insert_into_database(timestamp, pid, process, syscall, size);
}

void execute_and_print_systemtap_output() {
    FILE *fp;
    char buffer[BUFFER_SIZE];

    fp = popen("sudo stap " SYSTEMTAP_SCRIPT, "r");
    if (fp == NULL) {
        fprintf(stderr, "Error al ejecutar el script de SystemTap: %s\n", strerror(errno));
        return;
    }

    while (fgets(buffer, BUFFER_SIZE, fp) != NULL) {
        process_line(buffer);
        fflush(stdout);
        usleep(10000);
    }

    int status = pclose(fp);
    if (status == -1) {
        fprintf(stderr, "Error al cerrar el pipe: %s\n", strerror(errno));
    } else if (WIFEXITED(status)) {
        printf("El script de SystemTap se ejecutó correctamente.\n");
    } else {
        fprintf(stderr, "El script de SystemTap falló con estado %d.\n", WEXITSTATUS(status));
    }
}

int main() {
    init_database();
    execute_and_print_systemtap_output();
    mysql_close(conn);
    return 0;
}