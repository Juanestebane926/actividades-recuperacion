package pruebas;

import com.curso.vacantes.controller.VacanteController;
import curso.soporte.AppSpring;
import curso.soporte.Http;
import curso.soporte.Respuesta;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 5: POST con @RequestBody, 201 y 400. */
class P5Test {
    static final String VALIDA = "{\"titulo\":\"QA Tester\",\"empresa\":\"Datos SAS\",\"salario\":2100000}";

    @Test
    @DisplayName("POST válido responde 201 con la vacante creada")
    void t1_creada() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Respuesta r = app.post("/api/vacantes", VALIDA);
            Http.estado(r, 201, "Al crear se responde 201: revisa qué constante de HttpStatus corresponde y que el cuerpo sea la vacante creada.");
            Http.igual(4L, Http.campo(r.json(), "id").asLong(), "Campo \"id\" de la vacante creada");
            Http.igual("QA Tester", Http.campo(r.json(), "titulo").asText(), "Campo \"titulo\"");
        }
    }

    @Test
    @DisplayName("La vacante creada queda guardada (GET /api/vacantes/4)")
    void t2_guardada() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            app.post("/api/vacantes", VALIDA);
            Http.estado(app.get("/api/vacantes/4"), 200, "Después del POST, GET /api/vacantes/4 no la encuentra: el controller debe pedirle al service que la guarde.");
        }
    }

    @Test
    @DisplayName("Título vacío, nulo o con espacios → 400 \"El título es obligatorio\"")
    void t3_validacion() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Respuesta r = app.post("/api/vacantes", "{\"titulo\":\"\",\"empresa\":\"X\",\"salario\":1000000}");
            Http.estado(r, 400, "Con el título vacío debe responder 400 antes de crear nada; el mensaje exacto está en la tarea.");
            Http.igual("El título es obligatorio", r.texto(), "Mensaje de error");
            Http.estado(app.post("/api/vacantes", "{\"empresa\":\"X\",\"salario\":1000000}"), 400,
                    "Si el JSON no trae título, getTitulo() no devuelve ningún texto: tu validación también debe cubrir ese caso.");
            Http.estado(app.post("/api/vacantes", "{\"titulo\":\"   \",\"empresa\":\"X\",\"salario\":1000000}"), 400,
                    "Un título con solo espacios también cuenta como vacío: quita los espacios antes de revisarlo.");
            Http.igual(3, Http.lista(app.get("/api/vacantes").json(), "La lista").size(), "Cantidad de vacantes (las inválidas no se deben guardar)");
        }
    }
}
