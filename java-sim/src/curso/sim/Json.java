package curso.sim;
import java.lang.reflect.*;
import java.util.*;
/** Mini JSON: lee (a Map/List/String/Double/Boolean/null) y escribe objetos Java al estilo Jackson. */
public final class Json {
    private final String s; private int i;
    private Json(String s) { this.s = s; }
    public static Object leer(String texto) {
        if (texto == null) throw new IllegalArgumentException("La respuesta está vacía (null)");
        Json p = new Json(texto.trim());
        if (p.s.isEmpty()) throw new IllegalArgumentException("La respuesta está vacía");
        Object v = p.valor();
        p.esp();
        if (p.i < p.s.length()) throw p.error("Sobran caracteres después del JSON");
        return v;
    }
    private IllegalArgumentException error(String m) {
        int a = Math.max(0, i - 15), b = Math.min(s.length(), i + 15);
        return new IllegalArgumentException(m + " (posición " + i + ", cerca de: «" + s.substring(a, b) + "»)");
    }
    private void esp() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
    private Object valor() {
        esp();
        if (i >= s.length()) throw error("El JSON terminó antes de tiempo");
        char c = s.charAt(i);
        if (c == '{') return objeto();
        if (c == '[') return lista();
        if (c == '"') return cadena();
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        if (s.startsWith("null", i)) { i += 4; return null; }
        if (c == '-' || Character.isDigit(c)) return numero();
        throw error("Carácter inesperado '" + c + "' (¿faltan comillas?)");
    }
    private Map<String, Object> objeto() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        i++; esp();
        if (i < s.length() && s.charAt(i) == '}') { i++; return m; }
        while (true) {
            esp();
            if (i >= s.length() || s.charAt(i) != '"') throw error("Se esperaba el nombre de un campo entre comillas dobles");
            String k = cadena(); esp();
            if (i >= s.length() || s.charAt(i) != ':') throw error("Falta ':' después de \"" + k + "\"");
            i++;
            m.put(k, valor()); esp();
            if (i >= s.length()) throw error("Falta cerrar '}'");
            char c = s.charAt(i++);
            if (c == '}') return m;
            if (c != ',') { i--; throw error("Se esperaba ',' o '}'"); }
        }
    }
    private List<Object> lista() {
        List<Object> l = new ArrayList<Object>();
        i++; esp();
        if (i < s.length() && s.charAt(i) == ']') { i++; return l; }
        while (true) {
            l.add(valor()); esp();
            if (i >= s.length()) throw error("Falta cerrar ']'");
            char c = s.charAt(i++);
            if (c == ']') return l;
            if (c != ',') { i--; throw error("Se esperaba ',' o ']' (¿sobra o falta una coma?)"); }
        }
    }
    private String cadena() {
        StringBuilder b = new StringBuilder(); i++;
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (c == '"') return b.toString();
            if (c == '\\' && i < s.length()) {
                char e = s.charAt(i++);
                switch (e) {
                    case 'n': b.append('\n'); break; case 't': b.append('\t'); break;
                    case 'r': b.append('\r'); break; case 'b': b.append('\b'); break; case 'f': b.append('\f'); break;
                    case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                    default: b.append(e);
                }
            } else b.append(c);
        }
        throw error("Falta cerrar comillas");
    }
    private Double numero() {
        int a = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
        try { return Double.valueOf(s.substring(a, i)); } catch (NumberFormatException e) { throw error("Número inválido"); }
    }

    // ---------- escritura ----------
    public static String escribir(Object o) { StringBuilder b = new StringBuilder(); esc(o, b, 0); return b.toString(); }
    private static void str(String t, StringBuilder b) {
        b.append('"');
        for (char c : t.toCharArray()) {
            if (c == '"') b.append("\\\""); else if (c == '\\') b.append("\\\\");
            else if (c == '\n') b.append("\\n"); else if (c == '\r') b.append("\\r"); else if (c == '\t') b.append("\\t");
            else b.append(c);
        }
        b.append('"');
    }
    private static void esc(Object o, StringBuilder b, int prof) {
        if (prof > 30) throw new IllegalStateException("Objeto demasiado profundo (¿referencia circular?)");
        if (o == null) { b.append("null"); return; }
        if (o instanceof String || o instanceof Character || o instanceof Enum) { str(String.valueOf(o), b); return; }
        if (o instanceof Number || o instanceof Boolean) { b.append(o); return; }
        if (o instanceof Map) {
            b.append('{'); boolean p = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) {
                if (!p) b.append(','); p = false; str(String.valueOf(e.getKey()), b); b.append(':'); esc(e.getValue(), b, prof + 1);
            }
            b.append('}'); return;
        }
        if (o instanceof Iterable || o.getClass().isArray()) {
            List<Object> l = new ArrayList<Object>();
            if (o instanceof Iterable) for (Object x : (Iterable<?>) o) l.add(x);
            else for (int k = 0; k < Array.getLength(o); k++) l.add(Array.get(o, k));
            b.append('['); boolean p = true;
            for (Object x : l) { if (!p) b.append(','); p = false; esc(x, b, prof + 1); }
            b.append(']'); return;
        }
        b.append('{'); boolean p = true;
        for (Map.Entry<String, Method> e : getters(o.getClass()).entrySet()) {
            Object v;
            try { v = e.getValue().invoke(o); } catch (InvocationTargetException ex) { throw new RuntimeException(ex.getCause()); } catch (Exception ex) { continue; }
            if (!p) b.append(','); p = false; str(e.getKey(), b); b.append(':'); esc(v, b, prof + 1);
        }
        b.append('}');
    }
    /** getters públicos ordenados: primero en el orden de los atributos declarados. */
    static Map<String, Method> getters(Class<?> c) {
        Map<String, Method> todos = new LinkedHashMap<String, Method>();
        for (Method m : c.getMethods()) {
            if (m.getParameterTypes().length != 0 || Modifier.isStatic(m.getModifiers()) || m.getDeclaringClass() == Object.class) continue;
            String n = m.getName(), prop = null;
            if (n.startsWith("get") && n.length() > 3) prop = n.substring(3);
            else if (n.startsWith("is") && n.length() > 2 && (m.getReturnType() == boolean.class || m.getReturnType() == Boolean.class)) prop = n.substring(2);
            if (prop == null) continue;
            prop = Character.toLowerCase(prop.charAt(0)) + prop.substring(1);
            todos.put(prop, m);
        }
        Map<String, Method> orden = new LinkedHashMap<String, Method>();
        for (Class<?> k = c; k != null && k != Object.class; k = k.getSuperclass())
            for (Field f : k.getDeclaredFields()) if (todos.containsKey(f.getName())) orden.put(f.getName(), todos.get(f.getName()));
        for (Map.Entry<String, Method> e : todos.entrySet()) if (!orden.containsKey(e.getKey())) orden.put(e.getKey(), e.getValue());
        return orden;
    }

    // ---------- conversión a tipos Java (para @RequestBody / parámetros) ----------
    public static Object convertir(Object v, Class<?> t) throws Exception {
        if (v == null) return t.isPrimitive() ? Convertir.cero(t) : null;
        if (t == Object.class) return v;
        if (t == String.class) return v instanceof Double && ((Double) v) % 1 == 0 ? String.valueOf(((Double) v).longValue()) : String.valueOf(v);
        if (Convertir.esSimple(t)) return Convertir.texto(String.valueOf(v instanceof Double && ((Double) v) % 1 == 0 && t != double.class && t != Double.class && t != float.class && t != Float.class ? (Object) ((Double) v).longValue() : v), t);
        if (v instanceof Map && !Map.class.isAssignableFrom(t)) {
            Constructor<?> k = t.getDeclaredConstructor(); k.setAccessible(true);
            Object o = k.newInstance();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
                String campo = String.valueOf(e.getKey());
                String set = "set" + Character.toUpperCase(campo.charAt(0)) + campo.substring(1);
                boolean hecho = false;
                for (Method m : t.getMethods())
                    if (m.getName().equals(set) && m.getParameterTypes().length == 1) { m.invoke(o, convertir(e.getValue(), m.getParameterTypes()[0])); hecho = true; break; }
                if (!hecho) {
                    for (Class<?> c = t; c != null && !hecho; c = c.getSuperclass())
                        try { Field f = c.getDeclaredField(campo); f.setAccessible(true); f.set(o, convertir(e.getValue(), f.getType())); hecho = true; } catch (NoSuchFieldException ignore) { }
                }
            }
            return o;
        }
        return v;
    }
}
