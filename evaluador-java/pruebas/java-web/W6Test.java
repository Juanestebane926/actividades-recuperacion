package pruebas;

import static curso.soporte.Http.*;

import com.fasterxml.jackson.databind.JsonNode;
import curso.soporte.Respuesta;
import curso.soporte.ServidorWeb;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 6: doPost con getParameter, validaciones y códigos 201/400. */
class W6Test {

    @Test
    @DisplayName("POST válido responde 201 y guarda el estudiante")
    void t1_crear() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.post("/api/estudiantes", "nombre", "Sofia", "edad", "17", "nota", "4.2");
            estado(r, 201, "Al crear se responde 201: revisa en la tabla de la explicación qué constante de HttpServletResponse corresponde.");
            JsonNode e = campo(r.json(), "estudiante");
            igual("Sofia", campo(e, "nombre").asText(), "Nombre del estudiante creado");
            igual(4.2, campo(e, "nota").asDouble(), "Nota del estudiante creado");
            igual(4, campo(s.get("/api/estudiantes").json(), "total").asInt(), "Después del POST, el total del GET (¿el estudiante nuevo quedó guardado en el DAO?)");
        }
    }

    @Test
    @DisplayName("Sin nombre → 400 \"El nombre es obligatorio\"")
    void t2_sinNombre() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.post("/api/estudiantes", "edad", "17", "nota", "4.2");
            estado(r, 400, "Si getParameter(\"nombre\") es null o vacío responde 400.");
            igual("El nombre es obligatorio", campo(r.json(), "mensaje").asText(), "Campo \"mensaje\"");
            estado(s.post("/api/estudiantes", "nombre", "   ", "edad", "17", "nota", "4.2"), 400,
                    "Un nombre con solo espacios también cuenta como vacío.");
        }
    }

    @Test
    @DisplayName("Edad o nota no numérica → 400")
    void t3_noNumerica() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.post("/api/estudiantes", "nombre", "Sofia", "edad", "diecisiete", "nota", "4.2");
            estado(r, 400, "Con edad \"diecisiete\" la conversión a número falla: atrapa esa excepción y responde 400.");
            campo(r.json(), "mensaje");
        }
    }

    @Test
    @DisplayName("Nota fuera de 0–5 → 400")
    void t4_rango() {
        try (ServidorWeb s = ServidorWeb.iniciar()) {
            Respuesta r = s.post("/api/estudiantes", "nombre", "Sofia", "edad", "17", "nota", "7");
            estado(r, 400, "Valida que la nota esté entre 0 y 5.");
            igual("La nota debe estar entre 0 y 5", campo(r.json(), "mensaje").asText(), "Campo \"mensaje\"");
            igual(3, campo(s.get("/api/estudiantes").json(), "total").asInt(), "Total del GET (los estudiantes inválidos no se deben guardar)");
        }
    }
}
