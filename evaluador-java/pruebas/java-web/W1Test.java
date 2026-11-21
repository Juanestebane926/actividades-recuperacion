package pruebas;

import static curso.soporte.Http.igual;

import com.mycompany.recuperacion.util.Calificaciones;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 1: condicionales. */
class W1Test {

    @Test
    @DisplayName("estado() con notas altas y bajas")
    void t1_estado() {
        igual("Aprobado", Calificaciones.estado(4.5), "Calificaciones.estado(4.5)");
        igual("Reprobado", Calificaciones.estado(2.0), "Calificaciones.estado(2.0)");
        igual("Reprobado", Calificaciones.estado(2.9), "Calificaciones.estado(2.9)");
    }

    @Test
    @DisplayName("estado() con la nota de borde 3.0")
    void t2_borde() {
        igual("Aprobado", Calificaciones.estado(3.0), "Calificaciones.estado(3.0) (con 3.0 exacto también se aprueba: revisa qué operador incluye el 3.0)");
    }

    @Test
    @DisplayName("nivel() en los tres rangos")
    void t3_nivel() {
        igual("Excelente", Calificaciones.nivel(4.8), "Calificaciones.nivel(4.8)");
        igual("Aceptable", Calificaciones.nivel(4.0), "Calificaciones.nivel(4.0)");
        igual("Aceptable", Calificaciones.nivel(3.0), "Calificaciones.nivel(3.0)");
        igual("Insuficiente", Calificaciones.nivel(2.5), "Calificaciones.nivel(2.5)");
    }
}
