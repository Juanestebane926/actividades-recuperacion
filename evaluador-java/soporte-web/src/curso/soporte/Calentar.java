package curso.soporte;

import java.nio.file.Files;
import java.nio.file.Path;

/** Precalienta Tomcat (carga de clases) mientras el proceso espera un trabajo. */
public class Calentar {
    public static void calentar() {
        try {
            Path vacio = Files.createTempDirectory("calentar-web");
            System.setProperty("eval.clases", vacio.toString());
            System.setProperty("eval.dir", vacio.toString());
            try (ServidorWeb s = ServidorWeb.iniciar()) {
                s.get("/x", "a", "1");
                s.post("/x", "a", "1");
            }
        } catch (Throwable ignorar) { }
    }
}
