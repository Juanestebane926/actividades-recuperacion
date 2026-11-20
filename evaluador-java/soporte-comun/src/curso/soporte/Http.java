package curso.soporte;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Verificaciones sobre respuestas HTTP reales, con mensajes en español. */
public final class Http {
    private Http() {}

    public static void estado(Respuesta r, int esperado, String pista) {
        if (r.status != esperado) {
            throw new AssertionError(r.metodo + " " + r.url + " respondió " + r.status + " y se esperaba " + esperado + "."
                    + r.motivo() + (pista == null ? "" : "\n   💡 " + pista));
        }
    }

    public static void estado(Respuesta r, int esperado) { estado(r, esperado, null); }

    /** Lee un campo del JSON y falla con un mensaje claro si no existe. */
    public static JsonNode campo(JsonNode json, String nombre) {
        if (json == null || !json.isObject()) throw new AssertionError("Se esperaba un objeto JSON {…} con el campo \"" + nombre + "\", pero llegó: " + json);
        JsonNode v = json.get(nombre);
        if (v == null) throw new AssertionError("El JSON no tiene el campo \"" + nombre + "\". Llegó: " + json);
        return v;
    }

    public static JsonNode lista(JsonNode json, String que) {
        if (json == null || !json.isArray()) throw new AssertionError(que + " debía ser una lista JSON […], pero llegó: " + json);
        return json;
    }

    public static void igual(Object esperado, Object obtenido, String que) {
        boolean ok = esperado instanceof Number && obtenido instanceof Number
                ? Math.abs(((Number) esperado).doubleValue() - ((Number) obtenido).doubleValue()) < 1e-9
                : Objects.equals(esperado, obtenido);
        if (!ok) throw new AssertionError(que + "\n   Esperado: " + mostrar(esperado) + "\n   Obtenido: " + mostrar(obtenido));
    }

    static String mostrar(Object o) { return o instanceof String ? "\"" + o + "\"" : String.valueOf(o); }
}
