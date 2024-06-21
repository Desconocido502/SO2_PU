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
#define LOG_FILE "./systemtap_output.log"
#define BUFFER_SIZE 1024

void execute_systemtap_script() {
    char command[256];
    snprintf(command, sizeof(command), "sudo stap %s > %s", SYSTEMTAP_SCRIPT, LOG_FILE);
    int status = system(command);
    if (WIFEXITED(status) && WEXITSTATUS(status) == 0) {
        printf("El script de SystemTap se ejecutó correctamente.\n");
    } else {
        fprintf(stderr, "El script de SystemTap falló con estado %d.\n", WEXITSTATUS(status));
    }
}

void print_log_content() {
    FILE *fp;
    char buffer[BUFFER_SIZE];
    long last_position = 0;
    
    while (1) {
        fp = fopen(LOG_FILE, "r");
        if (fp == NULL) {
            printf("Error al abrir el archivo de log: %s\n", strerror(errno));
            sleep(1);
            continue;
        }

        fseek(fp, last_position, SEEK_SET);

        while (fgets(buffer, BUFFER_SIZE, fp) != NULL) {
            printf("%s", buffer);
            last_position = ftell(fp);
        }

        fclose(fp);
        usleep(50000);  // Espera 50ms antes de la siguiente lectura
    }
}

int main() {
    // Ejecutar el script de SystemTap en segundo plano
    if (fork() == 0) {
        execute_systemtap_script();
        exit(0);
    }

    // Proceso principal
    print_log_content();

    return 0;
}


