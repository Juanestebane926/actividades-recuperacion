package curso.sim;
import java.util.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;

/** Pruebas de la actividad de Java Web (API de estudiantes con Servlets). */
public class SuitesWeb extends Suites {
    static final String P = "com.mycompany.recuperacion.";

    static void estado(Ctx c, Respuesta r, int esperado, String pista) {
        if (r.status != esperado)
            throw new Falla(r.metodo + " " + r.url + " debía responder " + esperado + " pero respondió " + r.status + ". " + (pista == null ? "" : pista) + "\nRespuesta: " + r.texto);
    }

    public SuitesWeb() {
        // ------------------------------------------------------------ Paso 1
        caso("w1", "estado() con notas altas y bajas", c -> {
            Class<?> k = c.clase(P + "util.Calificaciones");
            c.igual("Aprobado", c.llamar(k, "estado", 4.5), "estado(4.5)");
            c.igual("Reprobado", c.llamar(k, "estado", 2.0), "estado(2.0)");
            c.igual("Reprobado", c.llamar(k, "estado", 2.9), "estado(2.9)");
        });
        caso("w1", "estado() con la nota de borde 3.0", c -> {
            Class<?> k = c.clase(P + "util.Calificaciones");
            c.igual("Aprobado", c.llamar(k, "estado", 3.0), "estado(3.0) (con 3.0 se aprueba: usa >=)");
        });
        caso("w1", "nivel() en los tres rangos", c -> {
            Class<?> k = c.clase(P + "util.Calificaciones");
            c.igual("Excelente", c.llamar(k, "nivel", 4.8), "nivel(4.8)");
            c.igual("Aceptable", c.llamar(k, "nivel", 4.0), "nivel(4.0)");
            c.igual("Aceptable", c.llamar(k, "nivel", 3.0), "nivel(3.0)");
            c.igual("Insuficiente", c.llamar(k, "nivel", 2.5), "nivel(2.5)");
        });
        // ------------------------------------------------------------ Paso 2
        caso("w2", "promedio() de varias notas", c -> {
            Class<?> k = c.clase(P + "util.Estadisticas");
            c.igual(4.0, c.llamar(k, "promedio", (Object) new double[] { 4.0, 3.0, 5.0 }), "promedio({4.0, 3.0, 5.0})");
            c.igual(3.5, c.llamar(k, "promedio", (Object) new double[] { 3.5 }), "promedio({3.5})");
            c.igual(3.0, c.llamar(k, "promedio", (Object) new double[] { 2.0, 4.0, 1.0, 5.0 }), "promedio({2.0, 4.0, 1.0, 5.0})");
        });
        caso("w2", "promedio() de un arreglo vacío es 0", c -> {
            Class<?> k = c.clase(P + "util.Estadisticas");
            c.igual(0.0, c.llamar(k, "promedio", (Object) new double[0]), "promedio({})");
        });
        caso("w2", "contarAprobados() cuenta las notas >= 3.0", c -> {
            Class<?> k = c.clase(P + "util.Estadisticas");
            c.igual(2, c.llamar(k, "contarAprobados", (Object) new double[] { 3.0, 2.9, 4.5, 1.0 }), "contarAprobados({3.0, 2.9, 4.5, 1.0})");
            c.igual(0, c.llamar(k, "contarAprobados", (Object) new double[0]), "contarAprobados({})");
            c.igual(3, c.llamar(k, "contarAprobados", (Object) new double[] { 5.0, 5.0, 5.0 }), "contarAprobados({5.0, 5.0, 5.0})");
        });
        // ------------------------------------------------------------ Paso 3
        caso("w3", "Constructor y getters", c -> {
            Object e = c.nuevo(c.clase(P + "model.Estudiante"), "Camila", 19, 4.1);
            c.igual("Camila", c.llamar(e, "getNombre"), "getNombre()");
            c.igual(19, c.llamar(e, "getEdad"), "getEdad()");
            c.igual(4.1, c.llamar(e, "getNota"), "getNota()");
        });
        caso("w3", "getEstadoAcademico()", c -> {
            Class<?> k = c.clase(P + "model.Estudiante");
            c.igual("Aprobado", c.llamar(c.nuevo(k, "Ana", 18, 4.6), "getEstadoAcademico"), "Estado con nota 4.6");
            c.igual("Aprobado", c.llamar(c.nuevo(k, "Leo", 18, 3.0), "getEstadoAcademico"), "Estado con nota 3.0");
            c.igual("Reprobado", c.llamar(c.nuevo(k, "Luisa", 19, 2.8), "getEstadoAcademico"), "Estado con nota 2.8");
        });
        caso("w3", "toString() produce JSON válido", c -> {
            Object e = c.nuevo(c.clase(P + "model.Estudiante"), "Ana", 18, 4.6);
            String t = String.valueOf(c.llamar(e, "toString"));
            c.demo("new Estudiante(\"Ana\", 18, 4.6).toString()  →  " + t);
            try { Json.leer(t); } catch (IllegalArgumentException ex) { throw new Falla("toString() no es JSON válido: " + ex.getMessage() + "\nObtuve: " + t); }
        });
        caso("w3", "toString() trae nombre, edad, nota y estado correctos", c -> {
            Object e = c.nuevo(c.clase(P + "model.Estudiante"), "Luisa", 19, 2.8);
            String t = String.valueOf(c.llamar(e, "toString"));
            c.demo("new Estudiante(\"Luisa\", 19, 2.8).toString()  →  " + t);
            Object j;
            try { j = Json.leer(t); } catch (IllegalArgumentException ex) { throw new Falla("toString() no es JSON válido: " + ex.getMessage()); }
            c.igual("Luisa", c.de(j, "nombre"), "Campo nombre");
            c.igual(19, c.de(j, "edad"), "Campo edad");
            c.igual(2.8, c.de(j, "nota"), "Campo nota");
            c.igual("Reprobado", c.de(j, "estado"), "Campo estado (usa getEstadoAcademico())");
        });
        // ------------------------------------------------------------ Paso 4
        caso("w4", "Un DAO nuevo empieza vacío", c -> {
            Object d = c.nuevo(c.clase(P + "dao.EstudianteDAO"));
            c.igual(0, c.llamar(d, "total"), "total() de un DAO nuevo");
            c.igual(0, ((List<?>) c.llamar(d, "listar")).size(), "Tamaño de listar() de un DAO nuevo");
        });
        caso("w4", "agregar() guarda en orden y total() cuenta", c -> {
            Class<?> E = c.clase(P + "model.Estudiante");
            Object d = c.nuevo(c.clase(P + "dao.EstudianteDAO"));
            c.llamar(d, "agregar", c.nuevo(E, "Ana", 18, 4.6));
            c.llamar(d, "agregar", c.nuevo(E, "Pedro", 20, 3.1));
            c.igual(2, c.llamar(d, "total"), "total() después de agregar 2");
            List<?> l = (List<?>) c.llamar(d, "listar");
            c.igual(2, l.size(), "Tamaño de listar()");
            c.igual("Pedro", c.llamar(l.get(1), "getNombre"), "Nombre del segundo estudiante");
        });
        caso("w4", "buscarPorNombre() ignora mayúsculas y devuelve null si no existe", c -> {
            Class<?> E = c.clase(P + "model.Estudiante");
            Object d = c.nuevo(c.clase(P + "dao.EstudianteDAO"));
            c.llamar(d, "agregar", c.nuevo(E, "Ana", 18, 4.6));
            c.llamar(d, "agregar", c.nuevo(E, "Pedro", 20, 3.1));
            Object p = c.llamar(d, "buscarPorNombre", "pedro");
            c.si(p != null, "buscarPorNombre(\"pedro\") devolvió null; debe encontrar a \"Pedro\" (usa equalsIgnoreCase).");
            c.igual(20, c.llamar(p, "getEdad"), "Edad de Pedro");
            c.si(c.llamar(d, "buscarPorNombre", "Zoe") == null, "buscarPorNombre(\"Zoe\") debe devolver null.");
        });
        // ------------------------------------------------------------ Paso 5
        caso("w5", "@WebServlet con la ruta /api/estudiantes", c -> {
            Class<?> k = c.clase(P + "api.EstudianteServlet");
            WebServlet w = k.getAnnotation(WebServlet.class);
            c.si(w != null, "Falta la anotación @WebServlet en la clase.");
            List<String> rutas = new ArrayList<String>(Arrays.asList(w.urlPatterns()));
            rutas.addAll(Arrays.asList(w.value()));
            c.si(rutas.contains("/api/estudiantes"), "La ruta del servlet debe ser \"/api/estudiantes\" pero es " + rutas + ".");
        });
        caso("w5", "GET responde 200 con Content-Type JSON", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "GET");
            estado(c, r, 200, null);
            String ct = String.valueOf(c.ultima.ultimoContentType);
            c.si(ct.startsWith("application/json"), "El Content-Type debe ser \"application/json\" (recibí: " + ct + ").");
        });
        caso("w5", "GET devuelve {\"total\":3,\"estudiantes\":[...]}", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "GET");
            Object j = r.json();
            c.igual(3, c.de(j, "total"), "Campo total");
            List<?> l = c.lista(c.de(j, "estudiantes"), "El campo estudiantes");
            c.igual(3, l.size(), "Cantidad de estudiantes en la lista");
            c.igual("Ana", c.de(l.get(0), "nombre"), "Nombre del primer estudiante");
            c.igual("Luisa", c.de(l.get(2), "nombre"), "Nombre del tercer estudiante");
        });
        // ------------------------------------------------------------ Paso 6
        caso("w6", "POST válido responde 201 y guarda el estudiante", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "POST", "nombre", "Sofia", "edad", "17", "nota", "4.2");
            estado(c, r, 201, "Al crear usa response.setStatus(HttpServletResponse.SC_CREATED).");
            Object e = c.de(r.json(), "estudiante");
            c.igual("Sofia", c.de(e, "nombre"), "Nombre del estudiante creado");
            c.igual(4.2, c.de(e, "nota"), "Nota del estudiante creado");
            Respuesta g = c.peticion(s, "GET");
            c.igual(4, c.de(g.json(), "total"), "Después del POST, el total del GET (¿llamaste dao.agregar(...)?)");
        });
        caso("w6", "Sin nombre → 400 \"El nombre es obligatorio\"", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "POST", "edad", "17", "nota", "4.2");
            estado(c, r, 400, "Si getParameter(\"nombre\") es null o vacío responde 400.");
            c.igual("El nombre es obligatorio", c.de(r.json(), "mensaje"), "Mensaje");
            Respuesta r2 = c.peticion(s, "POST", "nombre", "   ", "edad", "17", "nota", "4.2");
            estado(c, r2, 400, "Un nombre con solo espacios también es vacío (usa trim().isEmpty()).");
        });
        caso("w6", "Edad o nota no numérica → 400", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "POST", "nombre", "Sofia", "edad", "diecisiete", "nota", "4.2");
            estado(c, r, 400, "Integer.parseInt lanza NumberFormatException: atrápala con try/catch y responde 400.");
            c.de(r.json(), "mensaje");
        });
        caso("w6", "Nota fuera de 0–5 → 400", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "POST", "nombre", "Sofia", "edad", "17", "nota", "7");
            estado(c, r, 400, "Valida que la nota esté entre 0 y 5.");
            c.igual("La nota debe estar entre 0 y 5", c.de(r.json(), "mensaje"), "Mensaje");
            c.igual(3, c.de(c.peticion(s, "GET").json(), "total"), "Los estudiantes inválidos no se deben guardar; total");
        });
        // ------------------------------------------------------------ Paso 7
        caso("w7", "GET ?nombre=pedro devuelve ese estudiante", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "GET", "nombre", "pedro");
            estado(c, r, 200, null);
            Object e = c.de(r.json(), "estudiante");
            c.igual("Pedro", c.de(e, "nombre"), "Nombre encontrado");
        });
        caso("w7", "GET ?nombre=Zoe responde 404", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "GET", "nombre", "Zoe");
            estado(c, r, 404, "Si buscarPorNombre devuelve null, usa response.setStatus(HttpServletResponse.SC_NOT_FOUND).");
            c.igual("Estudiante no encontrado", c.de(r.json(), "mensaje"), "Mensaje");
        });
        caso("w7", "La lista incluye \"promedio\" (usa Estadisticas)", c -> {
            HttpServlet s = c.servlet(P + "api.EstudianteServlet");
            Respuesta r = c.peticion(s, "GET");
            estado(c, r, 200, null);
            Object j = r.json();
            c.igual(3.5, c.de(j, "promedio"), "Campo promedio de (4.6 + 3.1 + 2.8) / 3");
            c.igual(3, c.de(j, "total"), "Campo total");
            c.peticion(s, "POST", "nombre", "Sofia", "edad", "17", "nota", "5");
            c.igual(3.875, c.de(c.peticion(s, "GET").json(), "promedio"), "Promedio después de agregar una nota 5.0");
        });
    }
}
