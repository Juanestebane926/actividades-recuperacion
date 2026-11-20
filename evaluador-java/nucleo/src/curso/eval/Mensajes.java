package curso.eval;

import java.util.*;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Convierte lo que lanzó una prueba (un assert que falló o una excepción del código del estudiante)
 * en un mensaje claro. No inventa nada: muestra el mensaje real y dónde ocurrió en SU código.
 */
public class Mensajes {
    static final Pattern ESPERADO = Pattern.compile("(?s)^(.*?)\\s*==> expected: <(.*)> but was: <(.*)>$");

    public static String explicar(Throwable t, Set<String> archivosEstudiante) {
        if (t == null) return "";
        String clase = t.getClass().getName();
        // Falla de un assert de JUnit: "mensaje ==> expected: <a> but was: <b>"
        if (clase.startsWith("org.opentest4j.") || t instanceof AssertionError) {
            String m = String.valueOf(t.getMessage());
            Matcher x = ESPERADO.matcher(m);
            if (x.matches()) {
                String que = x.group(1).trim();
                return (que.isEmpty() ? "Valor incorrecto." : que) + "\n   Esperado: " + x.group(2) + "\n   Obtenido: " + x.group(3);
            }
            if (t.getCause() != null && !(t.getCause() instanceof AssertionError)) return m + "\n" + explicar(t.getCause(), archivosEstudiante);
            return m;
        }
        if (t instanceof TimeoutException || clase.endsWith("TimeoutException")) {
            return "La prueba no terminó en 8 segundos. ¿Tienes un ciclo infinito (un for o while que nunca termina)?";
        }
        // Excepción lanzada por el código del estudiante: se muestra tal cual, con su archivo y línea
        Throwable raiz = t;
        StringBuilder b = new StringBuilder("Tu código lanzó una excepción: ").append(nombre(raiz));
        String donde = dondeOcurrio(raiz, archivosEstudiante);
        if (donde != null) b.append("\n   ").append(donde);
        String ayuda = ayuda(raiz);
        if (ayuda != null) b.append("\n   💡 ").append(ayuda);
        return b.toString();
    }

    public static String nombre(Throwable t) {
        return t.getClass().getName().replaceFirst("^java\\.lang\\.", "") + (t.getMessage() != null ? ": " + t.getMessage() : "");
    }

    /** "en VacanteService.java, línea 25 (método buscarPorId)" usando el stack trace real. */
    public static String dondeOcurrio(Throwable t, Set<String> archivos) {
        for (Throwable x = t; x != null; x = x.getCause()) {
            for (StackTraceElement e : x.getStackTrace()) {
                if (e.getFileName() != null && archivos.contains(e.getFileName()) && e.getLineNumber() > 0) {
                    return "en " + e.getFileName() + ", línea " + e.getLineNumber() + " (método " + e.getMethodName() + ")";
                }
            }
        }
        return null;
    }

    /** Igual que el anterior, pero reconoce el código del estudiante por su package (eval.paquete). */
    public static String dondeOcurrio(Throwable t) {
        String pkg = System.getProperty("eval.paquete", "\u0000") + ".";
        for (Throwable x = t; x != null; x = x.getCause()) {
            for (StackTraceElement e : x.getStackTrace()) {
                if (e.getClassName().startsWith(pkg) && e.getFileName() != null && e.getLineNumber() > 0) {
                    return "en " + e.getFileName() + ", línea " + e.getLineNumber() + " (método " + e.getMethodName() + ")";
                }
            }
        }
        return null;
    }

    /** Explicación de una excepción lanzada por el código del estudiante (para el soporte de cada curso). */
    public static String excepcion(Throwable t) {
        StringBuilder b = new StringBuilder(nombre(t));
        String donde = dondeOcurrio(t);
        if (donde != null) b.append("\n   ").append(donde);
        String a = ayuda(t);
        if (a != null) b.append("\n   💡 ").append(a);
        return b.toString();
    }

    static String ayuda(Throwable t) {
        if (t instanceof NullPointerException) return "Estás usando algo que vale null: un atributo sin asignar, un objeto que no se creó o un método que devolvió null.";
        if (t instanceof NumberFormatException) return "No se pudo convertir ese texto a número.";
        if (t instanceof IndexOutOfBoundsException) return "Te saliste de los límites de la lista o del arreglo (revisa la condición del for: < y no <=).";
        if (t instanceof ArithmeticException) return "¿División por cero?";
        if (t instanceof ClassCastException) return "Estás tratando un objeto como si fuera de otro tipo.";
        if (t instanceof StackOverflowError) return "Un método se llama a sí mismo sin parar (recursión infinita).";
        if (t instanceof UnsupportedOperationException) return "Esa lista no se puede modificar (por ejemplo, las creadas con List.of).";
        return null;
    }
}
