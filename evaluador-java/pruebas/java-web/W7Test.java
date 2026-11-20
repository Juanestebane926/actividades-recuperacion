package pruebas;

import static curso.soporte.Http.*;

import com.fasterxml.jackson.databind.JsonNode;
import curso.soporte.Respuesta;
import curso.soporte.ServidorWeb;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 7: búsqueda por nombre (404) y promedio con Estadisticas. */
class W7Test {

    @Test
    @DisplayName("GET ?nombre=pedro devuelve ese estudiante")
    void t1_buscar() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.get("/api/estudiantes", "nombre", "pedro");
            estado(r, 200);
            igual("Pedro", campo(campo(r.json(), "estudiante"), "nombre").asText(), "Nombre encontrado");
        }
    }

    @Test
    @DisplayName("GET ?nombre=Zoe responde 404")
    void t2_noExiste() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.get("/api/estudiantes", "nombre", "Zoe");
            estado(r, 404, "Si buscarPorNombre devuelve null, usa response.setStatus(HttpServletResponse.SC_NOT_FOUND).");
            igual("Estudiante no encontrado", campo(r.json(), "mensaje").asText(), "Campo \"mensaje\"");
        }
    }

    @Test
    @DisplayName("La lista incluye \"promedio\" (usa Estadisticas)")
    void t3_promedio() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.get("/api/estudiantes");
            estado(r, 200);
            JsonNode j = r.json();
            igual(3.5, campo(j, "promedio").asDouble(), "Campo \"promedio\" de (4.6 + 3.1 + 2.8) / 3");
            igual(3, campo(j, "total").asInt(), "Campo \"total\"");
            s.post("/api/estudiantes", "nombre", "Sofia", "edad", "17", "nota", "5");
            igual(3.875, campo(s.get("/api/estudiantes").json(), "promedio").asDouble(), "Promedio después de agregar una nota 5.0");
        }
    }
}
