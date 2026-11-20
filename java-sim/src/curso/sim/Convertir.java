package curso.sim;
final class Convertir {
    static boolean esSimple(Class<?> t) {
        return t.isPrimitive() || t == String.class || t == Integer.class || t == Long.class || t == Double.class
            || t == Boolean.class || t == Float.class || t == Short.class;
    }
    static Object cero(Class<?> t) {
        if (t == boolean.class) return false; if (t == int.class) return 0; if (t == long.class) return 0L;
        if (t == double.class) return 0.0; if (t == float.class) return 0f; return null;
    }
    static Object texto(String s, Class<?> t) {
        if (t == String.class) return s;
        if (t == int.class || t == Integer.class) return Integer.valueOf(s.trim());
        if (t == long.class || t == Long.class) return Long.valueOf(s.trim());
        if (t == double.class || t == Double.class) return Double.valueOf(s.trim());
        if (t == float.class || t == Float.class) return Float.valueOf(s.trim());
        if (t == short.class || t == Short.class) return Short.valueOf(s.trim());
        if (t == boolean.class || t == Boolean.class) return Boolean.valueOf(s.trim());
        throw new IllegalArgumentException("Tipo no soportado: " + t.getSimpleName());
    }
}
