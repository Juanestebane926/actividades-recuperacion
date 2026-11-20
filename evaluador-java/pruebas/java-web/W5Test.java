package pruebas;

import static curso.soporte.Http.*;
import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.mycompany.recuperacion.api.EstudianteServlet;
import curso.soporte.Respuesta;
import curso.soporte.ServidorWeb;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 5: servlet desplegado en un Tomcat real, GET en JSON. */
class W5Test {

    @Test
    @DisplayName("@WebServlet con la ruta /api/estudiantes")
    void t1_anotacion() {
        WebServlet w = EstudianteServlet.class.getAnnotation(WebServlet.class);
        assertNotNull(w, "Falta la anotación @WebServlet en la clase EstudianteServlet.");
        List<String> rutas = new ArrayList<>(Arrays.asList(w.urlPatterns()));
        rutas.addAll(Arrays.asList(w.value()));
        assertTrue(rutas.contains("/api/estudiantes"), "La ruta del servlet debe ser \"/api/estudiantes\" pero es " + rutas + ".");
    }

    @Test
    @DisplayName("GET /api/estudiantes responde 200 con Content-Type JSON")
    void t2_contentType() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.get("/api/estudiantes");
            estado(r, 200, "Tomcat desplegó estos servlets: " + s.servlets());
            String ct = String.valueOf(r.contentType);
            assertTrue(ct.startsWith("application/json"), "El Content-Type debe ser \"application/json\" (Tomcat respondió: " + ct + ").");
        }
    }

    @Test
    @DisplayName("GET devuelve {\"total\":3,\"estudiantes\":[...]}")
    void t3_json() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.get("/api/estudiantes");
            estado(r, 200);
            JsonNode j = r.json();
            igual(3, campo(j, "total").asInt(), "Campo \"total\"");
            JsonNode l = lista(campo(j, "estudiantes"), "El campo \"estudiantes\"");
            igual(3, l.size(), "Cantidad de estudiantes en la lista");
            igual("Ana", campo(l.get(0), "nombre").asText(), "Nombre del primer estudiante");
            igual("Luisa", campo(l.get(2), "nombre").asText(), "Nombre del tercer estudiante");
        }
    }
}
