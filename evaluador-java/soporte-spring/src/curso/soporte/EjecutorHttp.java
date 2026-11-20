package curso.soporte;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import curso.eval.Mensajes;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.io.DefaultResourceLoader;

/**
 * "▶ Ejecutar" de Spring Boot: arranca la aplicación del estudiante con su Tomcat embebido en un
 * puerto libre (como "Run" en el IDE) y le envía peticiones HTTP reales (como Thunder Client).
 */
public class EjecutorHttp {
    static final ObjectMapper JSON = new ObjectMapper();

    public static JsonNode ejecutar(ClassLoader cl, JsonNode cfg) throws Exception {
        ObjectNode r = JSON.createObjectNode();
        Class<?> aplicacion = Class.forName(cfg.get("aplicacion").asText(), true, cl);
        SpringApplication app = new SpringApplication(aplicacion);
        app.setResourceLoader(new DefaultResourceLoader(cl));
        app.setBannerMode(Banner.Mode.OFF);
        app.setRegisterShutdownHook(false);
        app.setDefaultProperties(Map.of("server.port", "0", "logging.level.root", "WARN",
                "logging.pattern.console", "%level %logger{0} - %msg%n", "spring.main.log-startup-info", "false"));
        ConfigurableApplicationContext ctx;
        ConfigurableApplicationContext[] contexto = new ConfigurableApplicationContext[1];
        app.addInitializers(c -> contexto[0] = c);
        long t0 = System.currentTimeMillis();
        try {
            ctx = app.run();
        } catch (Throwable e) {
            r.put("arranque", "Spring Boot no pudo arrancar tu aplicación (APPLICATION FAILED TO START):\n" + AppSpring.explicarArranque(e, cl, contexto[0]));
            r.putArray("respuestas");
            return r;
        }
        int puerto = ((WebServerApplicationContext) ctx).getWebServer().getPort();
        r.put("arranque", "Aplicación iniciada con Tomcat en el puerto " + puerto + " (" + (System.currentTimeMillis() - t0) + " ms)");
        r.set("respuestas", enviar(puerto, cfg.get("peticiones")));
        ctx.close();
        return r;
    }

    /** Envía las peticiones a http://localhost:puerto y devuelve lo que respondió el servidor. */
    public static ArrayNode enviar(int puerto, JsonNode peticiones) {
        ArrayNode salida = JSON.createArrayNode();
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        for (JsonNode p : peticiones) {
            ObjectNode x = salida.addObject();
            String metodo = p.path("metodo").asText("GET").toUpperCase();
            String ruta = p.path("ruta").asText("/");
            String cuerpo = p.path("cuerpo").asText("");
            String tipo = p.path("tipo").asText("application/json");
            x.put("metodo", metodo);
            x.put("ruta", ruta);
            if (!cuerpo.isEmpty()) x.put("enviado", cuerpo);
            try {
                HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + (ruta.startsWith("/") ? "" : "/") + ruta))
                        .timeout(Duration.ofSeconds(8));
                if (cuerpo.isEmpty()) b.method(metodo, HttpRequest.BodyPublishers.noBody());
                else b.header("Content-Type", tipo).method(metodo, HttpRequest.BodyPublishers.ofString(cuerpo));
                HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
                x.put("status", res.statusCode());
                x.put("contentType", res.headers().firstValue("Content-Type").orElse(""));
                x.put("cuerpo", res.body().length() > 6000 ? res.body().substring(0, 6000) + "…" : res.body());
            } catch (IllegalArgumentException e) {
                x.put("error", "La ruta no es válida: " + e.getMessage());
            } catch (Exception e) {
                x.put("error", "No hubo respuesta: " + Mensajes.nombre(e));
            }
        }
        return salida;
    }
}
