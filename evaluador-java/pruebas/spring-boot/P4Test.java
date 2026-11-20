package pruebas;

import static org.junit.jupiter.api.Assertions.*;

import com.curso.vacantes.controller.VacanteController;
import com.curso.vacantes.service.VacanteService;
import curso.soporte.AppSpring;
import curso.soporte.Http;
import curso.soporte.Respuesta;
import java.lang.reflect.Field;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 4: controller con inyección por constructor, GET y @PathVariable. */
class P4Test {

    @Test
    @DisplayName("Spring inyecta el VacanteService en el controller")
    void t1_inyeccion() throws Exception {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            VacanteController c = app.bean(VacanteController.class);
            Field f = VacanteController.class.getDeclaredField("vacanteService");
            f.setAccessible(true);
            Object inyectado = f.get(c);
            assertNotNull(inyectado, "El atributo vacanteService quedó en null: en el constructor asigna this.vacanteService = vacanteService;");
            assertSame(app.bean(VacanteService.class), inyectado,
                    "El controller no usa el VacanteService que creó Spring (¿lo creaste con new?). Recíbelo en el constructor.");
        }
    }

    @Test
    @DisplayName("GET /api/vacantes devuelve la lista (200)")
    void t2_listar() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Respuesta r = app.get("/api/vacantes");
            Http.estado(r, 200);
            Http.igual(3, Http.lista(r.json(), "La respuesta").size(), "Cantidad de vacantes en la respuesta");
        }
    }

    @Test
    @DisplayName("GET /api/vacantes/2 devuelve esa vacante (200)")
    void t3_porId() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Respuesta r = app.get("/api/vacantes/2");
            Http.estado(r, 200, "Usa @PathVariable para recibir el {id} de la ruta.");
            Http.igual("Auxiliar de soporte", Http.campo(r.json(), "titulo").asText(), "Campo \"titulo\"");
        }
    }

    @Test
    @DisplayName("GET /api/vacantes/99 responde 404")
    void t4_noExiste() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Http.estado(app.get("/api/vacantes/99"), 404, "Si no existe, devuelve ResponseEntity.notFound().build().");
        }
    }
}
