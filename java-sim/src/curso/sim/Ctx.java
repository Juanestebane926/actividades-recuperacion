package curso.sim;
import java.io.*;
import java.lang.reflect.*;
import java.util.*;
import javax.servlet.http.HttpServlet;

/** Herramientas para escribir las pruebas de cada paso. */
public class Ctx {
    final ClassLoader cl;
    final Map<String, String> fuentes; // nombre de archivo -> ruta
    final List<String> demos = new ArrayList<String>();
    Ctx(ClassLoader cl, Map<String, String> fuentes) { this.cl = cl; this.fuentes = fuentes; }

    public void demo(String t) { demos.add(t); }

    static String desc(Throwable t) {
        if (t instanceof InvocationTargetException && t.getCause() != null) t = t.getCause();
        String n = t.getClass().getSimpleName();
        if (t instanceof NullPointerException) return "NullPointerException (usaste algo que vale null; ¿olvidaste asignar un atributo o devolver un valor?)";
        if (t instanceof NumberFormatException) return "NumberFormatException: " + t.getMessage() + " (no se pudo convertir un texto a número)";
        if (t instanceof IndexOutOfBoundsException) return n + ": " + t.getMessage() + " (te saliste de la lista o del arreglo)";
        if (t instanceof ArithmeticException) return "ArithmeticException: " + t.getMessage() + " (¿división por cero?)";
        return n + (t.getMessage() != null ? ": " + t.getMessage() : "");
    }

    public void si(boolean cond, String mensaje) { if (!cond) throw new Falla(mensaje); }

    public Class<?> clase(String nombre) {
        try { return Class.forName(nombre, true, cl); }
        catch (ClassNotFoundException e) {
            String simple = nombre.substring(nombre.lastIndexOf('.') + 1);
            throw new Falla("No encuentro la clase " + simple + " (" + nombre + "). ¿Cambiaste su nombre o su package?");
        }
    }

    public String fuente(String archivo) {
        String ruta = fuentes.get(archivo);
        if (ruta == null) return "";
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(ruta), "UTF-8"));
            StringBuilder b = new StringBuilder(); String l;
            while ((l = r.readLine()) != null) b.append(l).append('\n');
            r.close();
            return b.toString();
        } catch (IOException e) { return ""; }
    }
    /** Fuente sin comentarios (para revisar que algo se escribió de verdad y no solo en un comentario). */
    public String codigo(String archivo) {
        return fuente(archivo).replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\n]*", "");
    }

    private static boolean compatible(Class<?> p, Object a) {
        if (a == null) return !p.isPrimitive();
        Class<?> c = a.getClass();
        if (p.isPrimitive()) {
            return (p == int.class && c == Integer.class) || (p == double.class && (c == Double.class || c == Integer.class))
                || (p == long.class && (c == Long.class || c == Integer.class)) || (p == boolean.class && c == Boolean.class);
        }
        return p.isAssignableFrom(c);
    }
    private static Object[] adaptar(Class<?>[] ps, Object[] args) {
        Object[] r = args.clone();
        for (int i = 0; i < ps.length; i++) {
            if (r[i] instanceof Integer && ps[i] == double.class) r[i] = ((Integer) r[i]).doubleValue();
            if (r[i] instanceof Integer && (ps[i] == long.class || ps[i] == Long.class)) r[i] = ((Integer) r[i]).longValue();
        }
        return r;
    }
    private static String firma(String n, Object[] args) {
        StringBuilder b = new StringBuilder(n).append('(');
        for (int i = 0; i < args.length; i++) { if (i > 0) b.append(", "); b.append(args[i] == null ? "null" : args[i].getClass().getSimpleName()); }
        return b.append(')').toString();
    }

    public Object nuevo(Class<?> c, Object... args) {
        for (Constructor<?> k : c.getDeclaredConstructors()) {
            Class<?>[] ps = k.getParameterTypes();
            if (ps.length != args.length) continue;
            boolean ok = true;
            for (int i = 0; i < ps.length; i++) if (!compatible(ps[i], args[i])) ok = false;
            if (!ok) continue;
            try { k.setAccessible(true); return k.newInstance(adaptar(ps, args)); }
            catch (InvocationTargetException e) { throw new Falla("El constructor de " + c.getSimpleName() + " lanzó un error: " + desc(e.getCause())); }
            catch (Exception e) { throw new Falla("No pude crear " + c.getSimpleName() + ": " + e); }
        }
        throw new Falla("No encontré el constructor " + firma(c.getSimpleName(), args) + " en la clase " + c.getSimpleName() + ".");
    }

    /** Llama un método (de instancia u estático si objetivo es una Class). */
    public Object llamar(Object objetivo, String metodo, Object... args) {
        Class<?> c = objetivo instanceof Class ? (Class<?>) objetivo : objetivo.getClass();
        Object inst = objetivo instanceof Class ? null : objetivo;
        for (Class<?> k = c; k != null; k = k.getSuperclass())
            for (Method m : k.getDeclaredMethods()) {
                if (!m.getName().equals(metodo) || m.getParameterTypes().length != args.length) continue;
                Class<?>[] ps = m.getParameterTypes();
                boolean ok = true;
                for (int i = 0; i < ps.length; i++) if (!compatible(ps[i], args[i])) ok = false;
                if (!ok) continue;
                if (inst == null && !Modifier.isStatic(m.getModifiers())) throw new Falla("El método " + metodo + " debe ser static.");
                try { m.setAccessible(true); return m.invoke(inst, adaptar(ps, args)); }
                catch (InvocationTargetException e) { throw new Falla("Tu método " + metodo + " lanzó un error: " + desc(e.getCause())); }
                catch (IllegalAccessException e) { throw new RuntimeException(e); }
            }
        throw new Falla("No encontré el método " + firma(metodo, args) + " en " + c.getSimpleName() + ". Revisa el nombre (mayúsculas incluidas) y los parámetros.");
    }

    public Object campo(Object o, String nombre) {
        for (Class<?> k = o.getClass(); k != null; k = k.getSuperclass())
            try { Field f = k.getDeclaredField(nombre); f.setAccessible(true); return f.get(o); }
            catch (NoSuchFieldException e) { } catch (IllegalAccessException e) { throw new RuntimeException(e); }
        throw new Falla("No encontré el atributo '" + nombre + "' en " + o.getClass().getSimpleName() + ".");
    }

    public static boolean igual(Object esperado, Object real) {
        if (esperado instanceof Number && real instanceof Number)
            return Math.abs(((Number) esperado).doubleValue() - ((Number) real).doubleValue()) < 1e-6;
        return esperado == null ? real == null : esperado.equals(real);
    }
    public static String mostrar(Object o) {
        if (o instanceof String) return "\"" + o + "\"";
        if (o instanceof Double && ((Double) o) % 1 == 0 && Math.abs((Double) o) < 1e15) return String.valueOf(((Double) o).longValue());
        return String.valueOf(o);
    }
    public void igual(Object esperado, Object real, String que) {
        if (!igual(esperado, real)) throw new Falla(que + ": se esperaba " + mostrar(esperado) + " pero se obtuvo " + mostrar(real) + ".");
    }

    // ------------------------------------------------ Spring
    public MiniSpring spring(String... clases) { return new MiniSpring(this, clases); }

    // ------------------------------------------------ Servlets
    public HttpServlet servlet(String nombre) {
        Class<?> c = clase(nombre);
        si(HttpServlet.class.isAssignableFrom(c), c.getSimpleName() + " debe heredar de HttpServlet (extends HttpServlet).");
        HttpServlet s = (HttpServlet) nuevo(c);
        try { s.init(); } catch (Throwable e) { throw new Falla("init() de " + c.getSimpleName() + " lanzó un error: " + desc(e)); }
        return s;
    }
    /** params: "clave", "valor", "clave2", "valor2"... */
    public Respuesta peticion(HttpServlet s, String metodo, String... params) {
        PeticionFalsa req = new PeticionFalsa(metodo, params);
        RespuestaFalsa resp = new RespuestaFalsa();
        try { s.service(req, resp); }
        catch (Throwable e) {
            Respuesta r = new Respuesta(metodo, req.getRequestURI() + req.consulta(), 500, null, "Excepción: " + desc(e));
            demo(r.resumen());
            throw new Falla("Tu servlet lanzó un error con " + metodo + req.consulta() + ": " + desc(e));
        }
        Respuesta r = new Respuesta(metodo, req.getRequestURI() + req.consulta(), resp.getStatus(), null, resp.cuerpo());
        demo(r.resumen() + (resp.getContentType() == null ? "" : "   [Content-Type: " + resp.getContentType() + "]"));
        resp.ultimoContentType = resp.getContentType();
        ultima = resp;
        return r;
    }
    public RespuestaFalsa ultima;

    /** Lee un campo de un Map JSON con mensaje claro. */
    @SuppressWarnings("unchecked")
    public Object de(Object json, String campo) {
        if (!(json instanceof Map)) throw new Falla("Se esperaba un objeto JSON { ... } pero llegó: " + Json.escribir(json));
        Map<String, Object> m = (Map<String, Object>) json;
        if (!m.containsKey(campo)) throw new Falla("Al JSON le falta el campo \"" + campo + "\". Campos recibidos: " + m.keySet());
        return m.get(campo);
    }
    public List<?> lista(Object json, String que) {
        if (!(json instanceof List)) throw new Falla(que + " debe ser una lista [ ... ] pero llegó: " + Json.escribir(json));
        return (List<?>) json;
    }
}
