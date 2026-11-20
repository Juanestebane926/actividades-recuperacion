package curso.sim;
import java.io.*;
import java.net.*;
import java.util.*;

/**
 * Punto de entrada que llama la página web (vía CheerpJ):
 *   Ejecutor <archivoSalida> <curso:spring|web> <suites:TODAS|p1,p2> <classpath> <dirClases> <fuente1.java> ...
 * Compila el código del estudiante con javac y corre las pruebas en un ClassLoader nuevo.
 */
public class Ejecutor {
    static String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\t", "\\t").replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] a) throws Exception {
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(a[0]), "UTF-8"));
        try { correr(a, out); }
        catch (Throwable t) { out.println("X\t" + esc("Error interno del evaluador: " + t)); }
        out.flush(); out.close();
    }

    static void correr(String[] a, PrintWriter out) throws Exception {
        String curso = a[1], suites = a[2], cp = a[3], dir = a[4];
        List<String> fuentes = new ArrayList<String>(Arrays.asList(a).subList(5, a.length));
        new File(dir).mkdirs();
        List<String> args = new ArrayList<String>(Arrays.asList("-encoding", "UTF-8", "-parameters", "-g", "-nowarn", "-cp", cp, "-d", dir));
        args.addAll(fuentes);
        StringWriter errores = new StringWriter();
        long t0 = System.currentTimeMillis();
        int r = compilar(args.toArray(new String[0]), new PrintWriter(errores));
        out.println("T\tcompilacion\t" + (System.currentTimeMillis() - t0));
        if (r != 0) { out.println("C\t" + esc(errores.toString())); return; }

        Map<String, String> mapa = new HashMap<String, String>();
        for (String f : fuentes) mapa.put(f.substring(f.lastIndexOf('/') + 1), f);
        URLClassLoader cl = new URLClassLoader(new URL[] { new File(dir).toURI().toURL() }, Ejecutor.class.getClassLoader());
        Suites s = curso.equals("spring") ? new SuitesSpring() : new SuitesWeb();
        List<String> pedidas = suites.equals("-") ? new ArrayList<String>() : suites.equals("TODAS") ? new ArrayList<String>(s.mapa.keySet()) : Arrays.asList(suites.split(","));
        for (String suite : pedidas) {
            List<Object[]> casos = s.mapa.get(suite);
            if (casos == null) { out.println("X\t" + esc("Suite desconocida: " + suite)); continue; }
            for (Object[] caso : casos) {
                Ctx ctx = new Ctx(cl, mapa);
                String[] res = ejecutarCaso(ctx, (Caso) caso[1]);
                for (String d : ctx.demos) out.println("D\t" + suite + "\t" + esc(d));
                out.println("R\t" + suite + "\t" + res[0] + "\t" + esc((String) caso[0]) + "\t" + esc(res[1]));
            }
        }
    }

    static int compilar(String[] args, PrintWriter err) {
        return com.sun.tools.javac.Main.compile(args, err);
    }

    static String[] ejecutarCaso(final Ctx ctx, final Caso caso) throws InterruptedException {
        final String[] res = { "FALLO", "La prueba no terminó a tiempo: ¿hay un ciclo infinito (while que nunca termina)?" };
        final ByteArrayOutputStream consola = new ByteArrayOutputStream();
        final PrintStream original = System.out;
        Thread t = new Thread(new Runnable() { public void run() {
            try { caso.correr(ctx); res[0] = "OK"; res[1] = ""; }
            catch (Falla f) { res[0] = "FALLO"; res[1] = f.getMessage(); }
            catch (Throwable e) { res[0] = "FALLO"; res[1] = "Tu código lanzó un error: " + Ctx.desc(e); }
        }});
        t.setDaemon(true);
        try {
            System.setOut(new PrintStream(consola, true));
            t.start();
            t.join(8000);
        } finally { System.setOut(original); }
        String impreso = consola.toString().trim();
        if (!impreso.isEmpty()) ctx.demos.add("System.out → " + impreso);
        return res;
    }
}
