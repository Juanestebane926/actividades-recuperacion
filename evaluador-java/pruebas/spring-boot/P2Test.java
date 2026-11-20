package pruebas;

import com.curso.vacantes.controller.SaludoController;
import curso.soporte.AppSpring;
import curso.soporte.Http;
import curso.soporte.Respuesta;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 2: @RequestParam con valor por defecto y respuesta JSON. */
class P2Test {

    @Test
    @DisplayName("GET /api/saludo?nombre=Ana → {\"mensaje\":\"Hola, Ana\"}")
    void t1_conNombre() {
        try (AppSpring app = AppSpring.con(SaludoController.class)) {
            Respuesta r = app.get("/api/saludo?nombre=Ana");
            Http.estado(r, 200);
            Http.igual("Hola, Ana", Http.campo(r.json(), "mensaje").asText(), "Campo \"mensaje\" del JSON");
        }
    }

    @Test
    @DisplayName("El nombre sale del parámetro (no está escrito fijo)")
    void t2_noFijo() {
        try (AppSpring app = AppSpring.con(SaludoController.class)) {
            Respuesta r = app.get("/api/saludo?nombre=Valentina");
            Http.estado(r, 200);
            Http.igual("Hola, Valentina", Http.campo(r.json(), "mensaje").asText(), "Con ?nombre=Valentina, el campo \"mensaje\"");
        }
    }

    @Test
    @DisplayName("Sin nombre usa el valor por defecto \"invitado\"")
    void t3_porDefecto() {
        try (AppSpring app = AppSpring.con(SaludoController.class)) {
            Respuesta r = app.get("/api/saludo");
            Http.estado(r, 200, "Si respondió 400 es porque el parámetro es obligatorio: usa defaultValue = \"invitado\".");
            Http.igual("Hola, invitado", Http.campo(r.json(), "mensaje").asText(), "Sin parámetro, el campo \"mensaje\"");
        }
    }
}
