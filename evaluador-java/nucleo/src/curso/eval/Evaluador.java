package curso.eval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.tools.*;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.launcher.*;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;

/**
 * Evaluador real de código Java de los estudiantes.
 *
 * Recibe un trabajo (JSON) con los archivos del estudiante, los compila con javac (el de verdad,
 * el mismo del JDK) y luego:
 *   - modo "comprobar": compila y ejecuta las pruebas JUnit 5 de cada paso contra ese código;
 *   - modo "ejecutar":  corre el programa (Spring Boot con Tomcat, Tomcat con Servlets o un main)
 *                       y devuelve lo que pasó.
 * Imprime una sola línea "@@RESULTADO@@{json}" en la salida estándar.
 *
 * Uso:  java -cp ... curso.eval.Evaluador trabajo.json
 *       java -cp ... curso.eval.Evaluador --esperar     (se precalienta y lee la ruta del trabajo por stdin)
 */
public class Evaluador {
    static final ObjectMapper JSON = new ObjectMapper();
    static final PrintStream SALIDA_REAL = new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);
    static final ByteArrayOutputStream CAPTURA = new ByteArrayOutputStream();

    public static void main(String[] args) throws Exception {
        String rutaTrabajo;
        if (args.length > 0 && args[0].equals("--esperar")) {
            calentar();
            SALIDA_REAL.println("@@LISTO@@");
            SALIDA_REAL.flush();
            BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
            rutaTrabajo = in.readLine();
            if (rutaTrabajo == null) System.exit(0);
        } else {
            rutaTrabajo = args[0];
        }
        ObjectNode r;
        try {
            JsonNode trabajo = JSON.readTree(new File(rutaTrabajo.trim()));
            r = new Evaluador(trabajo).correr();
        } catch (Throwable t) {
            r = JSON.createObjectNode();
            StringWriter sw = new StringWriter();
            t.printStackTrace(new PrintWriter(sw));
            r.put("errorInterno", sw.toString());
        }
        SALIDA_REAL.println("@@RESULTADO@@" + JSON.writeValueAsString(r));
        SALIDA_REAL.flush();
        Runtime.getRuntime().halt(0); // Tomcat/Spring dejan hilos vivos: salimos ya
    }

    /** Carga javac, JUnit y (si existe) el soporte del curso para que el primer trabajo sea rápido. */
    static void calentar() {
        try {
            Path d = Files.createTempDirectory("calentar");
            Path f = d.resolve("Calentar.java");
            Files.writeString(f, "class Calentar { int x() { return java.util.List.of(1).size(); } }");
            JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
            try (StandardJavaFileManager fm = jc.getStandardFileManager(null, null, StandardCharsets.UTF_8)) {
                jc.getTask(null, fm, null, List.of("-d", d.toString()), null, fm.getJavaFileObjects(f)).call();
            }
            LauncherFactory.create();
            try {
                Class<?> k = Class.forName("curso.soporte.Calentar");
                k.getMethod("calentar").invoke(null);
            } catch (ClassNotFoundException e) { /* el curso no tiene precalentamiento */ }
        } catch (Throwable t) { /* el calentamiento es opcional */ }
    }

    // ------------------------------------------------------------------------------------------

    final JsonNode trabajo;
    final Path dir;
    final Map<String, String> archivos = new LinkedHashMap<>();   // nombre -> código del estudiante
    final Map<String, String> extras = new LinkedHashMap<>();     // archivos que agrega el servidor (p. ej. la clase @SpringBootApplication)
    final String classpath = System.getProperty("java.class.path");

    Evaluador(JsonNode trabajo) {
        this.trabajo = trabajo;
        this.dir = Paths.get(trabajo.get("dir").asText());
        trabajo.get("archivos").fields().forEachRemaining(e -> archivos.put(e.getKey(), e.getValue().asText()));
        if (trabajo.has("extras")) trabajo.get("extras").fields().forEachRemaining(e -> extras.put(e.getKey(), e.getValue().asText()));
        System.setProperty("eval.dir", dir.toString());
        if (trabajo.has("paquete")) System.setProperty("eval.paquete", trabajo.get("paquete").asText());
    }

    ObjectNode correr() throws Exception {
        String modo = trabajo.get("modo").asText();
        System.setOut(new PrintStream(new Duplicador(CAPTURA), true, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(new Duplicador(CAPTURA), true, StandardCharsets.UTF_8));
        return modo.equals("ejecutar") ? ejecutar() : comprobar();
    }

    // ------------------------------------------------------------------ compilación

    /** Error de compilación de javac, con la línea de código donde ocurrió. */
    static ObjectNode error(String archivo, long linea, long columna, String mensaje, String codigo) {
        ObjectNode e = JSON.createObjectNode();
        e.put("archivo", archivo);
        e.put("linea", linea);
        e.put("columna", columna);
        e.put("mensaje", mensaje);
        e.put("codigo", codigo == null ? "" : codigo);
        return e;
    }

    static String paqueteDe(String fuente) {
        Matcher m = Pattern.compile("^\\s*package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE).matcher(fuente);
        return m.find() ? m.group(1) : "";
    }

    /** Escribe los archivos en src/<paquete>/ (como en un proyecto real) y devuelve archivo -> ruta. */
    Map<String, Path> escribir(Path src, Map<String, String> fuentes) throws IOException {
        Map<String, Path> rutas = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : fuentes.entrySet()) {
            String pkg = paqueteDe(e.getValue());
            Path carpeta = pkg.isEmpty() ? src : src.resolve(pkg.replace('.', File.separatorChar));
            Files.createDirectories(carpeta);
            Path p = carpeta.resolve(e.getKey());
            Files.writeString(p, e.getValue(), StandardCharsets.UTF_8);
            rutas.put(e.getKey(), p);
        }
        return rutas;
    }

    /** Compila con javac. Devuelve la lista de errores (vacía si compiló). */
    ArrayNode compilar(Collection<Path> fuentes, Path salida, String cpExtra) throws IOException {
        Files.createDirectories(salida);
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diag = new DiagnosticCollector<>();
        String cp = classpath + (cpExtra == null ? "" : File.pathSeparator + cpExtra);
        List<String> opciones = List.of("--release", "17", "-parameters", "-encoding", "UTF-8", "-g",
                "-Xmaxerrs", "30", "-cp", cp, "-d", salida.toString());
        ArrayNode errores = JSON.createArrayNode();
        try (StandardJavaFileManager fm = jc.getStandardFileManager(diag, Locale.ROOT, StandardCharsets.UTF_8)) {
            StringWriter otros = new StringWriter();
            boolean ok = jc.getTask(otros, fm, diag, opciones, null, fm.getJavaFileObjectsFromPaths(fuentes)).call();
            for (Diagnostic<? extends JavaFileObject> d : diag.getDiagnostics()) {
                if (d.getKind() != Diagnostic.Kind.ERROR) continue;
                String archivo = d.getSource() == null ? "" : Paths.get(d.getSource().toUri()).getFileName().toString();
                String linea = "";
                if (d.getSource() != null && d.getLineNumber() > 0) {
                    String[] ls = d.getSource().getCharContent(true).toString().split("\n", -1);
                    if (d.getLineNumber() <= ls.length) linea = ls[(int) d.getLineNumber() - 1];
                }
                errores.add(error(archivo, d.getLineNumber(), d.getColumnNumber(), d.getMessage(Locale.ROOT), linea));
            }
            if (!ok && errores.isEmpty()) errores.add(error("", 0, 0, otros.toString().trim(), ""));
        }
        return errores;
    }

    /** Compila los archivos del estudiante (más los extras del servidor) en dir/<nombre>/clases. */
    static class Compilado {
        Path clases; ArrayNode errores; Set<String> nombres;
    }

    Compilado compilarEstudiante(String nombre, Collection<String> nombres) throws IOException {
        Compilado c = new Compilado();
        Path base = dir.resolve(nombre);
        Map<String, String> fuentes = new LinkedHashMap<>();
        for (String n : nombres) if (archivos.containsKey(n)) fuentes.put(n, archivos.get(n));
        fuentes.putAll(extras);
        Map<String, Path> rutas = escribir(base.resolve("src"), fuentes);
        c.clases = base.resolve("clases");
        c.errores = compilar(rutas.values(), c.clases, null);
        c.nombres = new LinkedHashSet<>(nombres);
        return c;
    }

    /*
     * Qué se compila para cada paso:
     *  1. Primero todo el proyecto junto, como en el IDE. Si compila, todos los pasos usan eso.
     *  2. Si no compila, se sacan los archivos que tienen errores y cada paso se compila con el resto
     *     más SUS archivos. Así un archivo a medio hacer de un paso posterior no le quita la nota
     *     a los pasos anteriores, pero los errores de los archivos del paso sí se reportan.
     */
    Compilado todo;
    Set<String> conErrores;
    final Map<String, Compilado> cache = new HashMap<>();

    Compilado compilarParaPaso(JsonNode paso) throws IOException {
        if (todo == null) {
            todo = compilarEstudiante("todo", archivos.keySet());
            conErrores = new HashSet<>();
            for (JsonNode e : todo.errores) conErrores.add(e.get("archivo").asText());
        }
        if (todo.errores.isEmpty()) return todo;
        Set<String> propios = new TreeSet<>();
        paso.get("compilar").forEach(n -> propios.add(n.asText()));
        Set<String> nombres = new TreeSet<>(archivos.keySet());
        nombres.removeAll(conErrores);
        nombres.addAll(propios);
        // javac reporta primero los errores de sintaxis y solo después los de tipos, así que al quitar
        // un archivo pueden aparecer errores en otro: se repite hasta que solo queden errores (si hay)
        // en los archivos del paso.
        Compilado c = null;
        for (int intento = 0; intento < 6; intento++) {
            String clave = String.join("|", nombres);
            c = cache.get(clave);
            if (c == null) {
                c = compilarEstudiante("paso-" + paso.get("id").asText() + "-" + intento, nombres);
                cache.put(clave, c);
            }
            Set<String> ajenos = new TreeSet<>();
            for (JsonNode e : c.errores) { String a = e.get("archivo").asText(); if (!propios.contains(a) && archivos.containsKey(a)) ajenos.add(a); }
            if (ajenos.isEmpty()) break;
            nombres.removeAll(ajenos);
        }
        return c;
    }

    // ------------------------------------------------------------------ comprobar (JUnit)

    ObjectNode comprobar() throws Exception {
        ObjectNode r = JSON.createObjectNode();
        ObjectNode porPaso = r.putObject("pasos");
        List<JsonNode> pasos = new ArrayList<>();
        trabajo.get("pasos").forEach(pasos::add);

        ArrayNode erroresTodos = r.putArray("errores");
        Set<String> vistos = new HashSet<>();
        for (JsonNode p : pasos) {
            String id = p.get("id").asText();
            Compilado c = compilarParaPaso(p);
            for (JsonNode e : c.errores) if (vistos.add(e.toString())) erroresTodos.add(e);
            ObjectNode rp = porPaso.putObject(id);
            if (!c.errores.isEmpty()) {
                rp.set("errores", c.errores);
                rp.putArray("pruebas");
                continue;
            }
            rp.set("pruebas", correrPruebas(c, id, p.get("prueba").asText()));
        }
        r.put("consola", consola());
        return r;
    }

    /** Compila la clase de prueba del paso contra el código del estudiante y la ejecuta con JUnit 5. */
    ArrayNode correrPruebas(Compilado c, String id, String rutaPrueba) throws Exception {
        ArrayNode salida = JSON.createArrayNode();
        Path src = Paths.get(rutaPrueba);
        Path pruebas = c.clases.getParent().resolve("pruebas-" + id);
        ArrayNode errores = compilar(List.of(src), pruebas, c.clases.toString());
        if (!errores.isEmpty()) {
            // La prueba no compila contra el código del estudiante: casi siempre es porque cambió
            // el nombre de una clase, un método o un parámetro que la prueba necesita.
            ObjectNode x = salida.addObject();
            x.put("nombre", "Las pruebas de este paso pudieron usar tu código");
            x.put("ok", false);
            StringBuilder m = new StringBuilder("Las pruebas no pudieron usar tu código porque no encontraron lo que esperaban. javac dijo:\n");
            for (JsonNode e : errores) m.append("  • ").append(e.get("mensaje").asText().replace("\n", "\n    ")).append('\n');
            m.append("Revisa que no hayas cambiado nombres de clases, métodos o parámetros, ni el package.");
            x.put("mensaje", m.toString());
            x.put("noCompila", true);
            return salida;
        }
        String clase = "pruebas." + src.getFileName().toString().replace(".java", "");
        URLClassLoader cl = new URLClassLoader(new URL[] { c.clases.toUri().toURL(), pruebas.toUri().toURL() }, Evaluador.class.getClassLoader());
        Thread.currentThread().setContextClassLoader(cl);
        System.setProperty("eval.clases", c.clases.toString());
        Class<?> k = Class.forName(clase, true, cl);

        Map<String, ObjectNode> porId = new LinkedHashMap<>();
        TestExecutionListener oyente = new TestExecutionListener() {
            int inicio;
            @Override public void executionStarted(TestIdentifier t) { if (t.isTest()) inicio = CAPTURA.size(); }
            @Override public void executionFinished(TestIdentifier t, TestExecutionResult res) {
                if (!t.isTest()) return;
                ObjectNode x = JSON.createObjectNode();
                x.put("nombre", t.getDisplayName());
                x.put("ok", res.getStatus() == TestExecutionResult.Status.SUCCESSFUL);
                res.getThrowable().ifPresent(e -> x.put("mensaje", Mensajes.explicar(e, archivosConocidos())));
                String impreso = new String(CAPTURA.toByteArray(), StandardCharsets.UTF_8);
                impreso = impreso.length() > inicio ? impreso.substring(Math.min(inicio, impreso.length())) : "";
                if (!impreso.isBlank()) x.put("salida", recortar(impreso, 3000));
                porId.put(t.getUniqueId(), x);
            }
        };
        LauncherDiscoveryRequest req = LauncherDiscoveryRequestBuilder.request()
                .selectors(DiscoverySelectors.selectClass(k))
                .configurationParameter("junit.jupiter.testmethod.order.default", "org.junit.jupiter.api.MethodOrderer$MethodName")
                .configurationParameter("junit.jupiter.execution.timeout.default", "8 s")
                .configurationParameter("junit.jupiter.execution.timeout.thread.mode.default", "SEPARATE_THREAD")
                .build();
        Launcher launcher = LauncherFactory.create();
        launcher.execute(req, oyente);
        porId.values().forEach(salida::add);
        return salida;
    }

    Set<String> archivosConocidos() {
        Set<String> s = new HashSet<>(archivos.keySet());
        s.addAll(extras.keySet());
        return s;
    }

    // ------------------------------------------------------------------ ejecutar

    ObjectNode ejecutar() throws Exception {
        ObjectNode r = JSON.createObjectNode();
        JsonNode e = trabajo.get("ejecutar");
        Compilado c = compilarParaPaso(trabajo.get("pasos").get(0));
        r.set("errores", c.errores);
        if (!c.errores.isEmpty()) return r;
        URLClassLoader cl = new URLClassLoader(new URL[] { c.clases.toUri().toURL() }, Evaluador.class.getClassLoader());
        Thread.currentThread().setContextClassLoader(cl);
        System.setProperty("eval.clases", c.clases.toString());
        String tipo = e.get("tipo").asText();
        try {
            if (tipo.equals("java")) {
                ejecutarMain(r, c, cl, e.get("codigo").asText());
            } else {
                // HTTP real: Spring Boot o Tomcat, según el curso (lo implementa curso.soporte.EjecutorHttp)
                Class<?> k = Class.forName("curso.soporte.EjecutorHttp");
                Object res = k.getMethod("ejecutar", ClassLoader.class, JsonNode.class).invoke(null, cl, e);
                r.set("http", (JsonNode) res);
            }
        } catch (InvocationTargetException ex) {
            r.put("excepcion", Mensajes.explicar(ex.getCause(), archivosConocidos()));
        }
        r.put("consola", consola());
        return r;
    }

    /** Compila y corre un programa de demostración (un main) que usa las clases del estudiante. */
    void ejecutarMain(ObjectNode r, Compilado c, ClassLoader padre, String codigo) throws Exception {
        Set<String> paquetes = new TreeSet<>();
        for (String n : c.nombres) if (archivos.containsKey(n)) { String p = paqueteDe(archivos.get(n)); if (!p.isEmpty()) paquetes.add(p); }
        StringBuilder src = new StringBuilder("package demo;\nimport java.util.*;\n");
        for (String p : paquetes) src.append("import ").append(p).append(".*;\n");
        src.append("public class Demo {\n    public static void main(String[] args) throws Exception {\n").append(codigo).append("\n    }\n}\n");
        Path d = c.clases.getParent().resolve("demo-src/demo");
        Files.createDirectories(d);
        Path f = d.resolve("Demo.java");
        Files.writeString(f, src.toString());
        Path out = c.clases.getParent().resolve("demo");
        ArrayNode errores = compilar(List.of(f), out, c.clases.toString());
        if (!errores.isEmpty()) {
            StringBuilder m = new StringBuilder("El programa de prueba no pudo usar tu código. javac dijo:\n");
            for (JsonNode e : errores) m.append("  • ").append(e.get("mensaje").asText()).append('\n');
            m.append("Revisa que no hayas cambiado nombres de clases, métodos o parámetros.");
            r.put("excepcion", m.toString());
            return;
        }
        r.put("programa", codigo.strip());
        URLClassLoader cl = new URLClassLoader(new URL[] { out.toUri().toURL() }, padre);
        Method main = Class.forName("demo.Demo", true, cl).getMethod("main", String[].class);
        main.invoke(null, (Object) new String[0]);
    }

    // ------------------------------------------------------------------ utilidades

    static String consola() {
        String s = new String(CAPTURA.toByteArray(), StandardCharsets.UTF_8);
        return recortar(s, 20000);
    }

    static String recortar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "\n… (salida recortada)";
    }

    /** OutputStream que guarda todo lo que imprime el código del estudiante. */
    static class Duplicador extends OutputStream {
        final ByteArrayOutputStream destino;
        Duplicador(ByteArrayOutputStream d) { destino = d; }
        @Override public synchronized void write(int b) { if (destino.size() < 2_000_000) destino.write(b); }
        @Override public synchronized void write(byte[] b, int off, int len) { if (destino.size() < 2_000_000) destino.write(b, off, len); }
    }

    static String unir(Collection<String> c) { return c.stream().collect(Collectors.joining(", ")); }
}
