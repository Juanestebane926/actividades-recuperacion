package curso.sim;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

/** Pruebas de la actividad de Spring Boot (bolsa de empleo). */
public class SuitesSpring extends Suites {
    static final String P = "com.curso.vacantes.";
    static final String[] TODAS = { P + "controller.HolaController", P + "controller.SaludoController", P + "dto.SaludoResponse",
        P + "model.Vacante", P + "service.VacanteService", P + "controller.VacanteController" };

    static String texto(Respuesta r) { return r.texto == null ? "" : r.texto; }

    static void pide(Ctx c, Respuesta r, int status, String pista) {
        if (r.status != status) {
            String extra = r.status == 404 && status != 404 ? " Spring no encontró la ruta: revisa @RequestMapping de la clase y la anotación del método (@GetMapping, @PostMapping...)."
                : r.status == 500 ? " Tu código lanzó un error: " + r.texto : "";
            throw new Falla(r.metodo + " " + r.url + " debía responder " + status + " pero respondió " + r.status + "." + extra + (pista == null ? "" : " " + pista));
        }
    }

    public SuitesSpring() {
        // ------------------------------------------------------------ Paso 1
        caso("p1", "HolaController tiene @RestController", c -> {
            Class<?> k = c.clase(P + "controller.HolaController");
            c.si(k.isAnnotationPresent(RestController.class), "Falta la anotación @RestController encima de la clase HolaController.");
        });
        caso("p1", "GET /api/hola responde 200", c -> {
            c.clase(P + "controller.HolaController");
            pide(c, c.spring(TODAS).get("/api/hola"), 200, "La ruta completa es /api (clase) + /hola (método).");
        });
        caso("p1", "GET /api/hola devuelve \"Hola desde Spring Boot\"", c -> {
            c.clase(P + "controller.HolaController");
            Respuesta r = c.spring(TODAS).get("/api/hola");
            pide(c, r, 200, null);
            c.igual("Hola desde Spring Boot", texto(r).trim(), "Texto de la respuesta");
        });
        // ------------------------------------------------------------ Paso 2
        caso("p2", "GET /api/saludo?nombre=Ana → {\"mensaje\":\"Hola, Ana\"}", c -> {
            c.clase(P + "controller.SaludoController");
            Respuesta r = c.spring(TODAS).get("/api/saludo?nombre=Ana");
            pide(c, r, 200, "Si respondió 400, revisa que el parámetro use @RequestParam.");
            c.igual("Hola, Ana", c.de(r.json(), "mensaje"), "Campo mensaje");
        });
        caso("p2", "El nombre no está escrito fijo en el código", c -> {
            c.clase(P + "controller.SaludoController");
            Respuesta r = c.spring(TODAS).get("/api/saludo?nombre=Valentina");
            pide(c, r, 200, null);
            c.igual("Hola, Valentina", c.de(r.json(), "mensaje"), "Con nombre=Valentina, el mensaje");
        });
        caso("p2", "Sin nombre usa el valor por defecto \"invitado\"", c -> {
            c.clase(P + "controller.SaludoController");
            Respuesta r = c.spring(TODAS).get("/api/saludo");
            pide(c, r, 200, "Si respondió 400 es porque el parámetro es obligatorio: usa defaultValue = \"invitado\".");
            c.igual("Hola, invitado", c.de(r.json(), "mensaje"), "Sin parámetro, el mensaje");
        });
        // ------------------------------------------------------------ Paso 3
        caso("p3", "VacanteService tiene @Service", c -> {
            c.si(c.clase(P + "service.VacanteService").isAnnotationPresent(Service.class), "Falta la anotación @Service encima de la clase VacanteService.");
        });
        caso("p3", "listar() devuelve las 3 vacantes iniciales", c -> {
            Object s = c.nuevo(c.clase(P + "service.VacanteService"));
            Object l = c.llamar(s, "listar");
            c.si(l != null, "listar() devolvió null: debe devolver la lista vacantes.");
            c.igual(3, ((List<?>) l).size(), "Cantidad de vacantes");
        });
        caso("p3", "buscarPorId encuentra la vacante 2 y devuelve null con 99", c -> {
            Object s = c.nuevo(c.clase(P + "service.VacanteService"));
            Object v = c.llamar(s, "buscarPorId", 2L);
            c.si(v != null, "buscarPorId(2) devolvió null, pero la vacante 2 sí existe. Compara v.getId() con el id que llega por parámetro.");
            c.igual("Auxiliar de soporte", c.llamar(v, "getTitulo"), "Título de la vacante 2");
            c.si(c.llamar(s, "buscarPorId", 99L) == null, "buscarPorId(99) debe devolver null porque esa vacante no existe.");
        });
        caso("p3", "crear() asigna id 4, luego 5, y agrega a la lista", c -> {
            Class<?> V = c.clase(P + "model.Vacante");
            Object s = c.nuevo(c.clase(P + "service.VacanteService"));
            Object a = c.llamar(s, "crear", c.nuevo(V, null, "QA Tester", "Datos SAS", 2100000.0));
            c.si(a != null, "crear() devolvió null.");
            c.igual(4L, c.llamar(a, "getId"), "Id de la primera vacante creada");
            Object b = c.llamar(s, "crear", c.nuevo(V, null, "Diseñador UX", "Creativa", 2000000.0));
            c.igual(5L, c.llamar(b, "getId"), "Id de la segunda vacante creada");
            c.igual(5, ((List<?>) c.llamar(s, "listar")).size(), "Tamaño de la lista después de crear 2 vacantes (¿las agregaste con vacantes.add?)");
        });
        // ------------------------------------------------------------ Paso 4
        caso("p4", "Inyección por constructor (sin new VacanteService)", c -> {
            c.clase(P + "controller.VacanteController");
            c.si(!c.codigo("VacanteController.java").replace(" ", "").contains("newVacanteService("),
                "No crees el servicio con new VacanteService(): recíbelo en el constructor y Spring lo inyecta.");
            Object ctrl = c.spring(TODAS).bean(c.clase(P + "controller.VacanteController"));
            c.si(c.campo(ctrl, "vacanteService") != null, "El atributo vacanteService quedó en null: en el constructor asigna this.vacanteService = vacanteService;");
        });
        caso("p4", "GET /api/vacantes devuelve la lista (200)", c -> {
            c.clase(P + "controller.VacanteController");
            Respuesta r = c.spring(TODAS).get("/api/vacantes");
            pide(c, r, 200, null);
            c.igual(3, c.lista(r.json(), "La respuesta").size(), "Cantidad de vacantes en la respuesta");
        });
        caso("p4", "GET /api/vacantes/2 devuelve esa vacante (200)", c -> {
            c.clase(P + "controller.VacanteController");
            Respuesta r = c.spring(TODAS).get("/api/vacantes/2");
            pide(c, r, 200, "Usa @PathVariable para recibir el {id} de la ruta.");
            c.igual("Auxiliar de soporte", c.de(r.json(), "titulo"), "Campo titulo");
        });
        caso("p4", "GET /api/vacantes/99 responde 404", c -> {
            c.clase(P + "controller.VacanteController");
            pide(c, c.spring(TODAS).get("/api/vacantes/99"), 404, "Si no existe, devuelve ResponseEntity.notFound().build().");
        });
        // ------------------------------------------------------------ Paso 5
        caso("p5", "POST válido responde 201 con la vacante creada", c -> {
            c.clase(P + "controller.VacanteController");
            MiniSpring app = c.spring(TODAS);
            Respuesta r = app.post("/api/vacantes", "{\"titulo\":\"QA Tester\",\"empresa\":\"Datos SAS\",\"salario\":2100000}");
            pide(c, r, 201, "Para crear se responde 201: ResponseEntity.status(HttpStatus.CREATED).body(creada).");
            c.igual(4, c.de(r.json(), "id"), "Campo id de la vacante creada");
            c.igual("QA Tester", c.de(r.json(), "titulo"), "Campo titulo");
        });
        caso("p5", "La vacante creada queda guardada en el service", c -> {
            c.clase(P + "controller.VacanteController");
            MiniSpring app = c.spring(TODAS);
            app.post("/api/vacantes", "{\"titulo\":\"QA Tester\",\"empresa\":\"Datos SAS\",\"salario\":2100000}");
            Respuesta r = app.get("/api/vacantes/4");
            pide(c, r, 200, "Después del POST, GET /api/vacantes/4 debe encontrarla: llama a vacanteService.crear(vacante).");
        });
        caso("p5", "Título vacío → 400 \"El título es obligatorio\"", c -> {
            c.clase(P + "controller.VacanteController");
            MiniSpring app = c.spring(TODAS);
            Respuesta r = app.post("/api/vacantes", "{\"titulo\":\"\",\"empresa\":\"X\",\"salario\":1000000}");
            pide(c, r, 400, "Valida el título antes de crear: ResponseEntity.badRequest().body(\"El título es obligatorio\").");
            c.igual("El título es obligatorio", texto(r).trim(), "Mensaje de error");
            Respuesta r2 = app.post("/api/vacantes", "{\"empresa\":\"X\",\"salario\":1000000}");
            pide(c, r2, 400, "Si el JSON no trae título, getTitulo() es null: valida también ese caso (titulo == null).");
            Respuesta r3 = app.post("/api/vacantes", "{\"titulo\":\"   \",\"empresa\":\"X\",\"salario\":1000000}");
            pide(c, r3, 400, "Un título con solo espacios también es vacío: usa trim().isEmpty().");
            c.igual(3, c.lista(app.get("/api/vacantes").json(), "La lista").size(), "Las vacantes inválidas no se deben guardar; cantidad");
        });
        // ------------------------------------------------------------ Paso 6
        caso("p6", "buscarPorEmpresa ignora mayúsculas", c -> {
            Object s = c.nuevo(c.clase(P + "service.VacanteService"));
            c.igual(2, ((List<?>) c.llamar(s, "buscarPorEmpresa", "tech")).size(), "Vacantes de empresas que contienen \"tech\"");
            c.igual(1, ((List<?>) c.llamar(s, "buscarPorEmpresa", "ANDINA")).size(), "Vacantes de empresas que contienen \"ANDINA\"");
            c.igual(0, ((List<?>) c.llamar(s, "buscarPorEmpresa", "Google")).size(), "Vacantes de \"Google\"");
        });
        caso("p6", "GET /api/vacantes?empresa=... filtra", c -> {
            c.clase(P + "controller.VacanteController");
            MiniSpring app = c.spring(TODAS);
            Respuesta r = app.get("/api/vacantes?empresa=softandina");
            pide(c, r, 200, null);
            c.igual(1, c.lista(r.json(), "La respuesta").size(), "Con ?empresa=softandina, cantidad");
            Respuesta t = app.get("/api/vacantes");
            pide(c, t, 200, "Sin el parámetro debe seguir funcionando: usa @RequestParam(required = false).");
            c.igual(3, c.lista(t.json(), "La respuesta").size(), "Sin filtro, cantidad");
        });
        caso("p6", "eliminar() del service", c -> {
            Object s = c.nuevo(c.clase(P + "service.VacanteService"));
            c.igual(true, c.llamar(s, "eliminar", 1L), "eliminar(1) (sí existe) debe devolver");
            c.igual(2, ((List<?>) c.llamar(s, "listar")).size(), "Vacantes que quedan después de eliminar(1)");
            c.igual(false, c.llamar(s, "eliminar", 99L), "eliminar(99) (no existe) debe devolver");
        });
        caso("p6", "DELETE /api/vacantes/{id} → 204 / 404", c -> {
            c.clase(P + "controller.VacanteController");
            MiniSpring app = c.spring(TODAS);
            pide(c, app.delete("/api/vacantes/1"), 204, "Si se eliminó, responde ResponseEntity.noContent().build().");
            pide(c, app.get("/api/vacantes/1"), 404, "Después de borrarla, la vacante 1 ya no debe existir.");
            pide(c, app.delete("/api/vacantes/99"), 404, "Si no existe, responde ResponseEntity.notFound().build().");
        });
    }
}
