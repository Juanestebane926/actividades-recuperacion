package curso.soporte;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Precalienta Spring Boot (carga de clases y JIT) mientras el proceso espera un trabajo. */
public class Calentar {
    @SpringBootApplication(scanBasePackages = "curso.soporte.nada")
    @org.springframework.context.annotation.Import(Ctrl.class)
    public static class App { }

    @RestController
    public static class Ctrl {
        @GetMapping("/x") public String x() { return "x"; }
    }

    public static void calentar() {
        try (AppSpring a = AppSpring.iniciar(App.class)) {
            a.get("/x");
            a.post("/x", "{}");
        } catch (Throwable ignorar) { }
    }
}
