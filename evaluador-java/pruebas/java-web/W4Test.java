package pruebas;

import static curso.soporte.Http.igual;
import static org.junit.jupiter.api.Assertions.*;

import com.mycompany.recuperacion.dao.EstudianteDAO;
import com.mycompany.recuperacion.model.Estudiante;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 4: ArrayList y el patrón DAO. */
class W4Test {

    @Test
    @DisplayName("Un DAO nuevo empieza vacío")
    void t1_vacio() {
        EstudianteDAO d = new EstudianteDAO();
        igual(0, d.total(), "total() de un DAO nuevo");
        igual(0, d.listar().size(), "listar().size() de un DAO nuevo");
    }

    @Test
    @DisplayName("agregar() guarda en orden y total() cuenta")
    void t2_agregar() {
        EstudianteDAO d = new EstudianteDAO();
        d.agregar(new Estudiante("Ana", 18, 4.6));
        d.agregar(new Estudiante("Pedro", 20, 3.1));
        igual(2, d.total(), "total() después de agregar 2");
        List<Estudiante> l = d.listar();
        igual(2, l.size(), "listar().size()");
        igual("Pedro", l.get(1).getNombre(), "Nombre del segundo estudiante");
    }

    @Test
    @DisplayName("buscarPorNombre() ignora mayúsculas y devuelve null si no existe")
    void t3_buscar() {
        EstudianteDAO d = new EstudianteDAO();
        d.agregar(new Estudiante("Ana", 18, 4.6));
        d.agregar(new Estudiante("Pedro", 20, 3.1));
        Estudiante p = d.buscarPorNombre("pedro");
        assertNotNull(p, "buscarPorNombre(\"pedro\") devolvió null; debe encontrar a \"Pedro\" (la búsqueda debe ignorar mayúsculas: String tiene una variante de equals para eso).");
        igual(20, p.getEdad(), "Edad de Pedro");
        assertNull(d.buscarPorNombre("Zoe"), "buscarPorNombre(\"Zoe\") debe devolver null.");
    }
}
