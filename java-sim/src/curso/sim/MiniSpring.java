package curso.sim;
import java.lang.annotation.Annotation;
import java.lang.reflect.*;
import java.net.URLDecoder;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.*;
import org.springframework.web.bind.annotation.*;

/**
 * Simulador mínimo de Spring Boot: crea los beans (inyección por constructor y @Autowired)
 * y atiende peticiones HTTP buscando el método del @RestController que corresponde.
 */
public class MiniSpring {
    private final List<Class<?>> clases = new ArrayList<Class<?>>();
    private final Map<Class<?>, Object> beans = new LinkedHashMap<Class<?>, Object>();
    private final Ctx ctx;

    MiniSpring(Ctx ctx, String... nombres) {
        this.ctx = ctx;
        for (String n : nombres) {
            try { clases.add(Class.forName(n, true, ctx.cl)); } catch (Throwable e) { /* clase ausente: se ignora */ }
        }
    }

    static boolean esComponente(Class<?> c) {
        return c.isAnnotationPresent(Service.class) || c.isAnnotationPresent(Repository.class) || c.isAnnotationPresent(Component.class)
            || c.isAnnotationPresent(RestController.class) || c.isAnnotationPresent(Controller.class);
    }

    /** Obtiene (o crea) el bean de un tipo, como lo haría el contenedor de Spring. */
    public Object bean(Class<?> tipo) {
        return bean(tipo, new HashSet<Class<?>>());
    }
    private Object bean(Class<?> tipo, Set<Class<?>> creando) {
        if (beans.containsKey(tipo)) return beans.get(tipo);
        Class<?> impl = null;
        for (Class<?> c : clases) if (tipo.isAssignableFrom(c) && !c.isInterface() && !Modifier.isAbstract(c.getModifiers())) { impl = c; break; }
        if (impl == null) throw new Falla("Spring no encontró ningún bean de tipo " + tipo.getSimpleName() + ".");
        if (!esComponente(impl))
            throw new Falla("Spring no puede crear " + impl.getSimpleName() + ": le falta una anotación de componente (@Service, @Repository, @Component o @RestController). Sin ella Spring no la registra como bean.");
        if (!creando.add(impl)) throw new Falla("Dependencia circular al crear " + impl.getSimpleName());
        Constructor<?> elegido = null;
        for (Constructor<?> k : impl.getDeclaredConstructors()) if (k.isAnnotationPresent(Autowired.class)) elegido = k;
        if (elegido == null) for (Constructor<?> k : impl.getDeclaredConstructors())
            if (elegido == null || k.getParameterTypes().length > elegido.getParameterTypes().length) elegido = k;
        Object[] args = new Object[elegido.getParameterTypes().length];
        for (int i = 0; i < args.length; i++) args[i] = bean(elegido.getParameterTypes()[i], creando);
        Object o;
        try { elegido.setAccessible(true); o = elegido.newInstance(args); }
        catch (InvocationTargetException e) { throw new Falla("El constructor de " + impl.getSimpleName() + " lanzó un error: " + Ctx.desc(e.getCause())); }
        catch (Exception e) { throw new Falla("No se pudo crear " + impl.getSimpleName() + ": " + e); }
        for (Class<?> c = impl; c != null && c != Object.class; c = c.getSuperclass())
            for (Field f : c.getDeclaredFields()) if (f.isAnnotationPresent(Autowired.class)) {
                try { f.setAccessible(true); f.set(o, bean(f.getType(), creando)); } catch (IllegalAccessException e) { throw new RuntimeException(e); }
            }
        beans.put(tipo, o); beans.put(impl, o);
        creando.remove(impl);
        return o;
    }

    // ---------------------------------------------------------------- rutas
    private static String[] rutas(Annotation a) {
        try {
            String[] v = (String[]) a.annotationType().getMethod("value").invoke(a);
            String[] p = (String[]) a.annotationType().getMethod("path").invoke(a);
            String[] r = v.length > 0 ? v : p;
            return r.length > 0 ? r : new String[] { "" };
        } catch (Exception e) { return new String[] { "" }; }
    }
    private static String unir(String a, String b) {
        String r = ("/" + a + "/" + b).replaceAll("/+", "/");
        if (r.length() > 1 && r.endsWith("/")) r = r.substring(0, r.length() - 1);
        return r;
    }
    private static String verbo(Method m) {
        if (m.isAnnotationPresent(GetMapping.class)) return "GET";
        if (m.isAnnotationPresent(PostMapping.class)) return "POST";
        if (m.isAnnotationPresent(PutMapping.class)) return "PUT";
        if (m.isAnnotationPresent(DeleteMapping.class)) return "DELETE";
        if (m.isAnnotationPresent(PatchMapping.class)) return "PATCH";
        if (m.isAnnotationPresent(RequestMapping.class)) {
            RequestMethod[] rm = m.getAnnotation(RequestMapping.class).method();
            return rm.length == 0 ? "*" : rm[0].name();
        }
        return null;
    }
    private static Annotation mapeo(Method m) {
        for (Class<? extends Annotation> a : Arrays.<Class<? extends Annotation>>asList(GetMapping.class, PostMapping.class, PutMapping.class, DeleteMapping.class, PatchMapping.class, RequestMapping.class))
            if (m.isAnnotationPresent(a)) return m.getAnnotation(a);
        return null;
    }

    private static class Ruta { Class<?> ctrl; Method m; String verbo, patron; }

    private List<Ruta> todasLasRutas() {
        List<Ruta> l = new ArrayList<Ruta>();
        for (Class<?> c : clases) {
            if (!c.isAnnotationPresent(RestController.class) && !c.isAnnotationPresent(Controller.class)) continue;
            String[] bases = c.isAnnotationPresent(RequestMapping.class) ? rutas(c.getAnnotation(RequestMapping.class)) : new String[] { "" };
            for (Method m : c.getDeclaredMethods()) {
                String v = verbo(m);
                if (v == null) continue;
                for (String b : bases) for (String s : rutas(mapeo(m))) {
                    Ruta r = new Ruta(); r.ctrl = c; r.m = m; r.verbo = v; r.patron = unir(b, s); l.add(r);
                }
            }
        }
        return l;
    }

    /** Devuelve las variables de ruta si el patrón coincide, o null. */
    private static Map<String, String> coincide(String patron, String ruta) {
        String[] p = patron.split("/"), r = ruta.split("/");
        if (p.length != r.length) return null;
        Map<String, String> vars = new LinkedHashMap<String, String>();
        for (int i = 0; i < p.length; i++) {
            if (p[i].startsWith("{") && p[i].endsWith("}")) vars.put(p[i].substring(1, p[i].length() - 1), r[i]);
            else if (!p[i].equals(r[i])) return null;
        }
        return vars;
    }
    private static int literales(String patron) { int n = 0; for (String s : patron.split("/")) if (!s.startsWith("{")) n++; return n; }

    /** Simula una petición HTTP. body puede ser null. */
    public Respuesta peticion(String metodo, String url, String body) {
        String ruta = url, query = "";
        int q = url.indexOf('?');
        if (q >= 0) { ruta = url.substring(0, q); query = url.substring(q + 1); }
        ruta = unir(ruta, "");
        Map<String, String> params = new LinkedHashMap<String, String>();
        for (String par : query.split("&")) {
            if (par.isEmpty()) continue;
            int e = par.indexOf('=');
            try {
                String k = URLDecoder.decode(e < 0 ? par : par.substring(0, e), "UTF-8");
                String v = e < 0 ? "" : URLDecoder.decode(par.substring(e + 1), "UTF-8");
                params.put(k, v);
            } catch (Exception ex) { throw new RuntimeException(ex); }
        }
        Ruta mejor = null; Map<String, String> vars = null; boolean rutaExiste = false;
        for (Ruta r : todasLasRutas()) {
            Map<String, String> v = coincide(r.patron, ruta);
            if (v == null) continue;
            rutaExiste = true;
            if (!r.verbo.equals(metodo) && !r.verbo.equals("*")) continue;
            if (mejor == null || literales(r.patron) > literales(mejor.patron)) { mejor = r; vars = v; }
        }
        if (mejor == null) {
            int st = rutaExiste ? 405 : 404;
            String msg = rutaExiste ? "{\"error\":\"Method Not Allowed\",\"detalle\":\"La ruta existe pero no con " + metodo + "\"}"
                                    : "{\"error\":\"Not Found\",\"detalle\":\"Ningún controller atiende " + metodo + " " + ruta + "\"}";
            return reg(new Respuesta(metodo, url, st, null, msg));
        }
        Method m = mejor.m;
        Class<?>[] tipos = m.getParameterTypes();
        Annotation[][] anns = m.getParameterAnnotations();
        String[] nombresParam = nombresParametros(m);
        Object[] args = new Object[tipos.length];
        for (int i = 0; i < tipos.length; i++) {
            PathVariable pv = null; RequestParam rp = null; RequestBody rb = null;
            for (Annotation a : anns[i]) {
                if (a instanceof PathVariable) pv = (PathVariable) a;
                if (a instanceof RequestParam) rp = (RequestParam) a;
                if (a instanceof RequestBody) rb = (RequestBody) a;
            }
            try {
                if (pv != null) {
                    String n = !pv.value().isEmpty() ? pv.value() : !pv.name().isEmpty() ? pv.name() : nombresParam[i];
                    String val = vars.get(n);
                    if (val == null && vars.size() == 1) val = vars.values().iterator().next();
                    if (val == null) return reg(new Respuesta(metodo, url, 500, null, "{\"error\":\"@PathVariable '" + n + "' no aparece en la ruta " + mejor.patron + "\"}"));
                    args[i] = Convertir.texto(val, tipos[i]);
                } else if (rp != null) {
                    String n = !rp.value().isEmpty() ? rp.value() : !rp.name().isEmpty() ? rp.name() : nombresParam[i];
                    String val = params.get(n);
                    if (val == null && !ValueConstants.DEFAULT_NONE.equals(rp.defaultValue())) val = rp.defaultValue();
                    if (val == null && rp.required()) return reg(new Respuesta(metodo, url, 400, null, "{\"error\":\"Bad Request\",\"detalle\":\"Falta el parámetro obligatorio '" + n + "'\"}"));
                    args[i] = val == null ? Convertir.cero(tipos[i]) : Convertir.texto(val, tipos[i]);
                } else if (rb != null) {
                    if (body == null || body.trim().isEmpty()) return reg(new Respuesta(metodo, url, 400, null, "{\"error\":\"Bad Request\",\"detalle\":\"Falta el cuerpo JSON\"}"));
                    args[i] = Json.convertir(Json.leer(body), tipos[i]);
                } else {
                    args[i] = Convertir.cero(tipos[i]);
                }
            } catch (NumberFormatException e) {
                return reg(new Respuesta(metodo, url, 400, null, "{\"error\":\"Bad Request\",\"detalle\":\"Un parámetro no tiene el tipo esperado\"}"));
            } catch (Exception e) {
                return reg(new Respuesta(metodo, url, 400, null, "{\"error\":\"Bad Request\",\"detalle\":\"No se pudo leer la entrada: " + e.getMessage() + "\"}"));
            }
        }
        Object ctrl = bean(mejor.ctrl);
        Object res;
        try { m.setAccessible(true); res = m.invoke(ctrl, args); }
        catch (InvocationTargetException e) {
            Throwable c = e.getCause();
            ResponseStatus rs = c.getClass().getAnnotation(ResponseStatus.class);
            if (rs != null) {
                int st = rs.code() != org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR ? rs.code().value() : rs.value().value();
                return reg(new Respuesta(metodo, url, st, null, "{\"error\":\"" + c.getMessage() + "\"}"));
            }
            return reg(new Respuesta(metodo, url, 500, null, "{\"error\":\"Internal Server Error\",\"detalle\":\"" + Ctx.desc(c).replace("\"", "'") + "\"}"));
        } catch (IllegalAccessException e) { throw new RuntimeException(e); }
        int status = 200;
        ResponseStatus rs = m.getAnnotation(ResponseStatus.class);
        if (rs != null) status = rs.code() != org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR ? rs.code().value() : rs.value().value();
        Object cuerpo = res;
        if (res instanceof ResponseEntity) { status = ((ResponseEntity<?>) res).getStatusCodeValue(); cuerpo = ((ResponseEntity<?>) res).getBody(); }
        String texto = cuerpo == null ? "" : cuerpo instanceof String ? (String) cuerpo : Json.escribir(cuerpo);
        return reg(new Respuesta(metodo, url, status, cuerpo, texto));
    }
    /**
     * Nombres de los parámetros de un método. Si la JVM no los guarda (pasa en CheerpJ),
     * se leen del código fuente del estudiante.
     */
    String[] nombresParametros(Method m) {
        Parameter[] ps = m.getParameters();
        String[] r = new String[ps.length];
        for (int i = 0; i < ps.length; i++) r[i] = ps[i].getName();
        String src = ctx.codigo(m.getDeclaringClass().getSimpleName() + ".java");
        java.util.regex.Matcher mt = java.util.regex.Pattern.compile("\\b" + m.getName() + "\\s*\\(").matcher(src);
        while (mt.find()) {
            int ini = mt.end(), prof = 1, k = ini;
            while (k < src.length() && prof > 0) { char ch = src.charAt(k); if (ch == '(') prof++; else if (ch == ')') prof--; k++; }
            String lista = src.substring(ini, Math.max(ini, k - 1));
            lista = lista.replaceAll("@\\w+(\\.\\w+)*\\s*(\\([^()]*\\))?", " ").replaceAll("<[^<>]*>", "").replaceAll("\\bfinal\\b", " ");
            String[] partes = lista.trim().isEmpty() ? new String[0] : lista.split(",");
            if (partes.length != ps.length) continue;
            boolean ok = true;
            for (int i = 0; i < partes.length; i++) {
                String[] tk = partes[i].trim().split("\\s+");
                if (tk.length < 2) { ok = false; break; }
                r[i] = tk[tk.length - 1];
            }
            if (ok) return r;
        }
        return r;
    }

    private Respuesta reg(Respuesta r) { ctx.demo(r.resumen()); return r; }
    public Respuesta get(String url) { return peticion("GET", url, null); }
    public Respuesta post(String url, String json) { return peticion("POST", url, json); }
    public Respuesta delete(String url) { return peticion("DELETE", url, null); }
    public Respuesta put(String url, String json) { return peticion("PUT", url, json); }
}
