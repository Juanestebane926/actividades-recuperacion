package pruebas;

import static org.junit.jupiter.api.Assertions.*;

import com.curso.vacantes.controller.HolaController;
import curso.soporte.AppSpring;
import curso.soporte.Http;
import curso.soporte.Respuesta;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestController;

/** Paso 1: primer endpoint GET /api/hola. */
class P1Test {

    @Test
    @DisplayName("HolaController tiene @RestController")
    void t1_anotacion() {
        assertTrue(HolaController.class.isAnnotationPresent(RestController.class),
                "A HolaController le falta la anotación que la convierte en un controlador REST (mira el primer ejemplo de la explicación).");
    }

    @Test
    @DisplayName("GET /api/hola responde 200")
    void t2_responde() {
        try (AppSpring app = AppSpring.con(HolaController.class)) {
            Http.estado(app.get("/api/hola"), 200, "La ruta completa es /api (de la clase) + /hola (del método).");
        }
    }

    @Test
    @DisplayName("GET /api/hola devuelve \"Hola desde Spring Boot\"")
    void t3_texto() {
        try (AppSpring app = AppSpring.con(HolaController.class)) {
            Respuesta r = app.get("/api/hola");
            Http.estado(r, 200);
            Http.igual("Hola desde Spring Boot", r.texto(), "Texto de la respuesta");
        }
    }
}
