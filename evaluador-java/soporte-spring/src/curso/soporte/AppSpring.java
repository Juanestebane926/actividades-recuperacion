package curso.soporte;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.ApplicationContextFactory;
import org.springframework.boot.diagnostics.FailureAnalysis;
import org.springframework.boot.diagnostics.FailureAnalyzer;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.support.SpringFactoriesLoader;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.GenericWebApplicationContext;

/**
 * Arranca la aplicación Spring Boot REAL del estudiante (escaneo de componentes, inyección de
 * dependencias, autoconfiguración, Jackson, Spring MVC) sobre un servidor simulado de pruebas
 * (MockMvc), igual que @SpringBootTest + @AutoConfigureMockMvc. Cada prueba arranca una app nueva,
 * así lo que una prueba crea o borra no afecta a la siguiente.
 */
public class AppSpring implements AutoCloseable {
    final ConfigurableApplicationContext ctx;
    final MockMvc mvc;

    private AppSpring(ConfigurableApplicationContext ctx) {
        this.ctx = ctx;
        this.mvc = MockMvcBuilders.webAppContextSetup((WebApplicationContext) ctx).build();
    }

    /** Autoconfiguración de Spring Boot (Spring MVC, Jackson…) sin escanear paquetes. */
    @org.springframework.context.annotation.Configuration(proxyBeanMethods = false)
    @org.springframework.boot.autoconfigure.EnableAutoConfiguration
    public static class Autoconfiguracion { }

    /** App con solo estos componentes (así un error en otra clase no afecta la prueba de este paso). */
    public static AppSpring con(Class<?>... componentes) {
        return iniciar(componentes, new String[0]);
    }

    /** Como con(...), pero además escanea el paquete service: el servicio necesita @Service, como en un proyecto real. */
    public static AppSpring conServicios(Class<?>... componentes) {
        return iniciar(componentes, new String[] { System.getProperty("eval.paquete", "com") + ".service" });
    }

    /** La aplicación completa (la clase @SpringBootApplication escanea todo el proyecto). */
    public static AppSpring iniciar(Class<?> aplicacion) {
        return iniciar(new Class<?>[] { aplicacion }, new String[0]);
    }

    static AppSpring iniciar(Class<?>[] componentes, String[] paquetes) {
        ClassLoader cl = componentes[0].getClassLoader();
        Class<?>[] fuentes = new Class<?>[componentes.length + 1];
        fuentes[0] = Autoconfiguracion.class;
        System.arraycopy(componentes, 0, fuentes, 1, componentes.length);
        SpringApplication app = new SpringApplication(fuentes);
        app.setResourceLoader(new DefaultResourceLoader(cl));
        if (paquetes.length > 0) {
            app.addInitializers(c -> new org.springframework.context.annotation.ClassPathBeanDefinitionScanner(
                    (org.springframework.beans.factory.support.BeanDefinitionRegistry) c, true, c.getEnvironment(), c).scan(paquetes));
        }
        Class<?> aplicacion = componentes[0];
        app.setWebApplicationType(WebApplicationType.SERVLET);
        GenericWebApplicationContext[] creado = new GenericWebApplicationContext[1];
        app.setApplicationContextFactory(ApplicationContextFactory.of(() -> creado[0] = new GenericWebApplicationContext(new MockServletContext())));
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);
        app.setRegisterShutdownHook(false);
        app.setDefaultProperties(Map.of("logging.level.root", "OFF", "spring.main.lazy-initialization", "false"));
        try {
            return new AppSpring(app.run());
        } catch (Throwable e) {
            throw new AssertionError("Spring Boot no pudo arrancar tu aplicación (APPLICATION FAILED TO START).\n"
                    + explicarArranque(e, aplicacion.getClassLoader(), creado[0]));
        }
    }

    /** Usa los FailureAnalyzer de Spring Boot: el mismo texto de "APPLICATION FAILED TO START". */
    public static String explicarArranque(Throwable e, ClassLoader cl, ConfigurableApplicationContext ctx) {
        try {
            SpringFactoriesLoader.ArgumentResolver args = ctx == null ? SpringFactoriesLoader.ArgumentResolver.none()
                    : SpringFactoriesLoader.ArgumentResolver.of(BeanFactory.class, ctx.getBeanFactory())
                        .and(ConfigurableListableBeanFactory.class, ctx.getBeanFactory())
                        .and(Environment.class, ctx.getEnvironment());
            List<FailureAnalyzer> analizadores = SpringFactoriesLoader.forDefaultResourceLocation(cl)
                    .load(FailureAnalyzer.class, args, SpringFactoriesLoader.FailureHandler.handleMessage((m, x) -> {}));
            for (FailureAnalyzer a : analizadores) {
                FailureAnalysis f;
                try { f = a.analyze(e); } catch (Throwable x) { continue; } // p. ej. analizadores de librerías que no están
                if (f != null) {
                    return "   " + f.getDescription().trim().replace("\n", "\n   ")
                            + (f.getAction() == null ? "" : "\n   Acción sugerida por Spring: " + f.getAction().trim().replace("\n", "\n   "));
                }
            }
        } catch (Throwable ignorar) { /* se usa la causa raíz */ }
        Throwable r = e;
        while (r.getCause() != null && r.getCause() != r) r = r.getCause();
        return "   " + r.getClass().getSimpleName() + ": " + r.getMessage();
    }

    public <T> T bean(Class<T> tipo) { return ctx.getBean(tipo); }

    public Respuesta get(String url) { return enviar("GET", MockMvcRequestBuilders.get(url), url); }
    public Respuesta delete(String url) { return enviar("DELETE", MockMvcRequestBuilders.delete(url), url); }
    public Respuesta post(String url, String json) {
        return enviar("POST", MockMvcRequestBuilders.post(url).contentType(MediaType.APPLICATION_JSON).content(json), url);
    }
    public Respuesta put(String url, String json) {
        return enviar("PUT", MockMvcRequestBuilders.put(url).contentType(MediaType.APPLICATION_JSON).content(json), url);
    }

    Respuesta enviar(String metodo, MockHttpServletRequestBuilder req, String url) {
        try {
            MvcResult r = mvc.perform(req.characterEncoding(StandardCharsets.UTF_8)).andReturn();
            return new Respuesta(metodo, url, r.getResponse().getStatus(), r.getResponse().getContentAsString(StandardCharsets.UTF_8),
                    r.getResponse().getContentType(), r.getResolvedException());
        } catch (Exception e) {
            // Excepción sin manejar dentro de un controller: en un servidor real es un 500
            Throwable causa = e.getCause() != null ? e.getCause() : e;
            return new Respuesta(metodo, url, 500, "", null, causa);
        }
    }

    @Override public void close() { try { ctx.close(); } catch (Throwable ignorar) { } }
}
