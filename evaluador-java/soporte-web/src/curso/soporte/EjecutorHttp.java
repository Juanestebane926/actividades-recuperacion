package curso.soporte;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import curso.eval.Mensajes;

/**
 * "▶ Ejecutar" de Java Web: despliega los servlets del estudiante en un Tomcat real y le envía
 * las peticiones HTTP que el estudiante escribió.
 */
public class EjecutorHttp {
    static final ObjectMapper JSON = new ObjectMapper();

    public static JsonNode ejecutar(ClassLoader cl, JsonNode cfg) {
        ObjectNode r = JSON.createObjectNode();
        ArrayNode salida = r.putArray("respuestas");
        long t0 = System.currentTimeMillis();
        ServidorWeb s;
        try {
            s = ServidorWeb.iniciar();
        } catch (AssertionError e) {
            r.put("arranque", e.getMessage());
            return r;
        }
        r.put("arranque", "Tomcat 9 iniciado en el puerto " + s.puerto + " (" + (System.currentTimeMillis() - t0) + " ms). Servlets desplegados: " + s.servlets());
        try {
            for (JsonNode p : cfg.get("peticiones")) {
                ObjectNode x = salida.addObject();
                String metodo = p.path("metodo").asText("GET").toUpperCase();
                String ruta = p.path("ruta").asText("/");
                if (!ruta.startsWith("/")) ruta = "/" + ruta;
                String cuerpo = p.path("cuerpo").asText("");
                x.put("metodo", metodo);
                x.put("ruta", ruta);
                if (!cuerpo.isEmpty()) x.put("enviado", cuerpo);
                try {
                    String tipo = cuerpo.startsWith("{") || cuerpo.startsWith("[") ? "application/json" : "application/x-www-form-urlencoded";
                    Respuesta res = s.enviar(metodo, ruta, cuerpo.isEmpty() ? null : cuerpo, tipo);
                    x.put("status", res.status);
                    x.put("contentType", res.contentType == null ? "" : res.contentType);
                    x.put("cuerpo", res.cuerpo.length() > 6000 ? res.cuerpo.substring(0, 6000) + "…" : res.cuerpo);
                    if (res.excepcion != null) x.put("excepcion", Mensajes.excepcion(res.excepcion));
                } catch (AssertionError | IllegalArgumentException e) {
                    x.put("error", e.getMessage());
                }
            }
        } finally {
            s.close();
        }
        return r;
    }
}
