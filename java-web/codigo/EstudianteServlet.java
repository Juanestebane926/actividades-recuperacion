package com.mycompany.recuperacion.api;

import com.mycompany.recuperacion.dao.EstudianteDAO;
import com.mycompany.recuperacion.model.Estudiante;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

// 1. Este servlet atiende la ruta /api/estudiantes
@WebServlet(name = "EstudianteServlet", urlPatterns = {"____"})
public class EstudianteServlet extends HttpServlet {

    private final EstudianteDAO dao = new EstudianteDAO();

    @Override
    public void init() throws ServletException {
        // Datos iniciales (se cargan una sola vez, cuando arranca el servlet)
        dao.agregar(new Estudiante("Ana", 18, 4.6));
        dao.agregar(new Estudiante("Pedro", 20, 3.1));
        dao.agregar(new Estudiante("Luisa", 19, 2.8));
    }

    // ---------------- PASO 5: GET -> lista en JSON ----------------
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setCharacterEncoding("UTF-8");
        // 2. Indica que la respuesta es JSON
        response.setContentType("____");

        // Paso 7: aquí va la búsqueda por nombre

        List<Estudiante> lista = dao.listar();
        StringBuilder json = new StringBuilder();
        // 3. "total" es la cantidad de estudiantes
        json.append("{\"total\":").append(____).append(",");
        json.append("\"estudiantes\":[");
        for (int i = 0; i < lista.size(); i++) {
            if (i > 0) {
                json.append(",");   // coma solo ENTRE elementos
            }
            // 4. Agrega el estudiante número i (su toString() ya es JSON)
            json.append(lista.get(____));
        }
        json.append("]}");

        try (PrintWriter out = response.getWriter()) {
            // 5. Envía el JSON al cliente
            out.print(____);
        }
    }

    // ---------------- PASO 6: POST -> crear estudiante ----------------
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");

        try (PrintWriter out = response.getWriter()) {
            // Escribe aquí tu código del paso 6
        }
    }
}
