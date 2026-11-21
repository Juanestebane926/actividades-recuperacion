package pruebas;

import static curso.soporte.Http.campo;
import static curso.soporte.Http.igual;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.recuperacion.model.Estudiante;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 3: clase con constructor, getters y toString en JSON. */
class W3Test {

    static JsonNode leer(String texto) {
        try {
            return new ObjectMapper().readTree(texto);
        } catch (Exception e) {
            throw new AssertionError("toString() no produce JSON válido.\n   Obtenido: " + texto
                    + "\n   Error de Jackson: " + e.getMessage().split("\n")[0]);
        }
    }

    @Test
    @DisplayName("Constructor y getters")
    void t1_getters() {
        Estudiante e = new Estudiante("Camila", 19, 4.1);
        igual("Camila", e.getNombre(), "getNombre()");
        igual(19, e.getEdad(), "getEdad()");
        igual(4.1, e.getNota(), "getNota()");
    }

    @Test
    @DisplayName("getEstadoAcademico()")
    void t2_estado() {
        igual("Aprobado", new Estudiante("Ana", 18, 4.6).getEstadoAcademico(), "Estado con nota 4.6");
        igual("Aprobado", new Estudiante("Leo", 18, 3.0).getEstadoAcademico(), "Estado con nota 3.0");
        igual("Reprobado", new Estudiante("Luisa", 19, 2.8).getEstadoAcademico(), "Estado con nota 2.8");
    }

    @Test
    @DisplayName("toString() produce JSON válido")
    void t3_jsonValido() {
        String t = new Estudiante("Ana", 18, 4.6).toString();
        System.out.println("new Estudiante(\"Ana\", 18, 4.6).toString()  →  " + t);
        leer(t);
    }

    @Test
    @DisplayName("toString() trae nombre, edad, nota y estado correctos")
    void t4_campos() {
        JsonNode j = leer(new Estudiante("Luisa", 19, 2.8).toString());
        igual("Luisa", campo(j, "nombre").asText(), "Campo \"nombre\"");
        igual(19, campo(j, "edad").asInt(), "Campo \"edad\"");
        igual(2.8, campo(j, "nota").asDouble(), "Campo \"nota\"");
        igual("Reprobado", campo(j, "estado").asText(), "Campo \"estado\" (debe salir del método de la clase que ya lo calcula)");
    }
}
