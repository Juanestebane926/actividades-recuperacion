package curso.soporte;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import org.apache.catalina.Context;
import org.apache.catalina.LifecycleState;
import org.apache.catalina.Wrapper;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.core.StandardContext;
import org.apache.catalina.startup.Constants;
import org.apache.catalina.startup.ContextConfig;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.valves.ValveBase;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;
import org.apache.tomcat.util.scan.StandardJarScanner;

/**
 * Tomcat 9 embebido REAL con las clases del estudiante en WEB-INF/classes. Tomcat lee las
 * anotaciones @WebServlet, crea el servlet, llama init() y atiende peticiones HTTP de verdad,
 * igual que cuando se despliega el .war desde NetBeans.
 */
public class ServidorWeb implements AutoCloseable {
    static final Logger LOG_TOMCAT = Logger.getLogger("org.apache");
    // Las excepciones de los servlets se capturan y se explican en la respuesta: no se repiten en el log
    static final Logger LOG_VALVE = Logger.getLogger("org.apache.catalina.core.StandardWrapperValve");
    static {
        LOG_TOMCAT.setLevel(Level.SEVERE);
        LOG_VALVE.setLevel(Level.OFF);
        for (java.util.logging.Handler h : Logger.getLogger("").getHandlers())
            h.setFilter(r -> !(r.getThrown() != null && r.getLoggerName() != null && r.getLoggerName().startsWith("org.apache.catalina.core.ContainerBase")));
    }

    final Tomcat tomcat;
    final StandardContext ctx;
    final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public final int puerto;
    volatile Throwable ultimaExcepcion;

    private ServidorWeb(Path clases) throws Exception {
        Path base = Files.createTempDirectory(Path.of(System.getProperty("eval.dir", System.getProperty("java.io.tmpdir"))), "tomcat");
        Path docBase = Files.createDirectories(base.resolve("webapp"));
        tomcat = new Tomcat();
        tomcat.setBaseDir(base.toString());
        tomcat.setPort(0);
        tomcat.getConnector();
        ctx = (StandardContext) tomcat.addContext("", docBase.toString());
        ContextConfig cfg = new ContextConfig();
        cfg.setDefaultWebXml(Constants.NoDefaultWebXml);
        ctx.addLifecycleListener(cfg);
        StandardJarScanner js = new StandardJarScanner();
        js.setScanClassPath(false);
        js.setScanManifest(false);
        ctx.setJarScanner(js);
        StandardRoot recursos = new StandardRoot(ctx);
        recursos.addPreResources(new DirResourceSet(recursos, "/WEB-INF/classes", clases.toAbsolutePath().toString(), "/"));
        ctx.setResources(recursos);
        ctx.getPipeline().addValve(new ValveBase() {
            @Override public void invoke(Request req, Response res) throws IOException, ServletException {
                getNext().invoke(req, res);
                Object t = req.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
                if (t instanceof Throwable) ultimaExcepcion = (Throwable) t;
            }
        });
        tomcat.start();
        if (ctx.getState() != LifecycleState.STARTED) {
            tomcat.stop();
            throw new AssertionError("Tomcat no pudo desplegar tu aplicación (revisa @WebServlet: dos servlets con la misma ruta o una ruta sin / inicial).");
        }
        puerto = tomcat.getConnector().getLocalPort();
    }

    /** Despliega las clases compiladas del estudiante (las que indica el evaluador). */
    public static ServidorWeb iniciar() {
        try {
            return new ServidorWeb(Path.of(System.getProperty("eval.clases")));
        } catch (AssertionError e) {
            throw e;
        } catch (Exception e) {
            Throwable r = e; while (r.getCause() != null) r = r.getCause();
            throw new AssertionError("Tomcat no pudo arrancar con tu código: " + r);
        }
    }

    /** Nombres de los servlets que Tomcat encontró y la ruta de cada uno. */
    public String servlets() {
        StringBuilder b = new StringBuilder();
        for (org.apache.catalina.Container c : ctx.findChildren()) {
            Wrapper w = (Wrapper) c;
            for (String m : ctx.findServletMappings()) if (w.getName().equals(ctx.findServletMapping(m))) b.append(b.length() > 0 ? ", " : "").append(m);
        }
        return b.length() == 0 ? "(ninguno)" : b.toString();
    }

    public Respuesta get(String ruta, String... parametros) {
        String q = parametros.length == 0 ? "" : (ruta.contains("?") ? "&" : "?") + formulario(parametros);
        return enviar("GET", ruta + q, null, null);
    }

    public Respuesta post(String ruta, String... parametros) {
        return enviar("POST", ruta, formulario(parametros), "application/x-www-form-urlencoded");
    }

    public static String formulario(String... kv) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (b.length() > 0) b.append('&');
            b.append(URLEncoder.encode(kv[i], StandardCharsets.UTF_8)).append('=').append(URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8));
        }
        return b.toString();
    }

    public Respuesta enviar(String metodo, String ruta, String cuerpo, String tipo) {
        ultimaExcepcion = null;
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + ruta)).timeout(Duration.ofSeconds(8));
            if (cuerpo == null) b.method(metodo, HttpRequest.BodyPublishers.noBody());
            else b.header("Content-Type", tipo).method(metodo, HttpRequest.BodyPublishers.ofString(cuerpo));
            HttpResponse<String> r = http.send(b.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            Throwable e = ultimaExcepcion;
            String cuerpoR = r.statusCode() >= 500 && e != null ? "" : r.body();
            return new Respuesta(metodo, ruta, r.statusCode(), cuerpoR, r.headers().firstValue("Content-Type").orElse(null), e);
        } catch (java.net.http.HttpTimeoutException e) {
            throw new AssertionError(metodo + " " + ruta + " no respondió en 8 segundos. ¿Hay un ciclo infinito en tu servlet?");
        } catch (Exception e) {
            throw new AssertionError(metodo + " " + ruta + ": no hubo respuesta del servidor (" + e + ")");
        }
    }

    @Override public void close() {
        try { tomcat.stop(); tomcat.destroy(); } catch (Throwable ignorar) { }
    }

    static File archivo(Path p) { return p.toFile(); }
}
