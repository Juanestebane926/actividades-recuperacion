package pruebas;

import static org.junit.jupiter.api.Assertions.*;

import com.curso.vacantes.model.Vacante;
import com.curso.vacantes.service.VacanteService;
import curso.soporte.Http;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Service;

/** Paso 3: la capa de servicio. Pruebas unitarias (sin Spring), como en un proyecto real. */
class P3Test {

    @Test
    @DisplayName("VacanteService tiene @Service")
    void t1_anotacion() {
        assertTrue(VacanteService.class.isAnnotationPresent(Service.class), "Falta la anotación @Service encima de la clase VacanteService.");
    }

    @Test
    @DisplayName("listar() devuelve las 3 vacantes iniciales")
    void t2_listar() {
        List<Vacante> l = new VacanteService().listar();
        assertNotNull(l, "listar() devolvió null: debe devolver la lista vacantes.");
        Http.igual(3, l.size(), "Cantidad de vacantes que devuelve listar()");
    }

    @Test
    @DisplayName("buscarPorId encuentra la vacante 2 y devuelve null con 99")
    void t3_buscar() {
        VacanteService s = new VacanteService();
        Vacante v = s.buscarPorId(2L);
        assertNotNull(v, "buscarPorId(2L) devolvió null, pero la vacante 2 sí existe. Compara v.getId() con el id que llega por parámetro.");
        Http.igual("Auxiliar de soporte", v.getTitulo(), "Título de la vacante que devolvió buscarPorId(2L)");
        assertNull(s.buscarPorId(99L), "buscarPorId(99L) debe devolver null porque esa vacante no existe.");
    }

    @Test
    @DisplayName("crear() asigna id 4, luego 5, y agrega a la lista")
    void t4_crear() {
        VacanteService s = new VacanteService();
        Vacante a = s.crear(new Vacante(null, "QA Tester", "Datos SAS", 2100000));
        assertNotNull(a, "crear() devolvió null.");
        Http.igual(4L, a.getId(), "Id de la primera vacante creada");
        Vacante b = s.crear(new Vacante(null, "Diseñador UX", "Creativa", 2000000));
        Http.igual(5L, b.getId(), "Id de la segunda vacante creada");
        Http.igual(5, s.listar().size(), "Tamaño de listar() después de crear 2 vacantes (¿las agregaste con vacantes.add?)");
    }
}
