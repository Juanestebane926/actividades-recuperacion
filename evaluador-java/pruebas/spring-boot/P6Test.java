package pruebas;

import com.curso.vacantes.controller.VacanteController;
import com.curso.vacantes.service.VacanteService;
import curso.soporte.AppSpring;
import curso.soporte.Http;
import curso.soporte.Respuesta;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 6: filtro opcional por empresa y DELETE. */
class P6Test {

    @Test
    @DisplayName("buscarPorEmpresa ignora mayúsculas")
    void t1_buscarPorEmpresa() {
        VacanteService s = new VacanteService();
        Http.igual(2, s.buscarPorEmpresa("tech").size(), "buscarPorEmpresa(\"tech\").size()");
        Http.igual(1, s.buscarPorEmpresa("ANDINA").size(), "buscarPorEmpresa(\"ANDINA\").size()");
        Http.igual(0, s.buscarPorEmpresa("Google").size(), "buscarPorEmpresa(\"Google\").size()");
    }

    @Test
    @DisplayName("GET /api/vacantes?empresa=... filtra (y sin el parámetro lista todo)")
    void t2_filtro() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Respuesta r = app.get("/api/vacantes?empresa=softandina");
            Http.estado(r, 200);
            Http.igual(1, Http.lista(r.json(), "La respuesta").size(), "Con ?empresa=softandina, cantidad de vacantes");
            Respuesta t = app.get("/api/vacantes");
            Http.estado(t, 200, "Sin el parámetro debe seguir funcionando: usa @RequestParam(required = false).");
            Http.igual(3, Http.lista(t.json(), "La respuesta").size(), "Sin filtro, cantidad de vacantes");
        }
    }

    @Test
    @DisplayName("eliminar() del service")
    void t3_eliminar() {
        VacanteService s = new VacanteService();
        Http.igual(true, s.eliminar(1L), "eliminar(1L) (sí existe) debe devolver");
        Http.igual(2, s.listar().size(), "Vacantes que quedan después de eliminar(1L)");
        Http.igual(false, s.eliminar(99L), "eliminar(99L) (no existe) debe devolver");
    }

    @Test
    @DisplayName("DELETE /api/vacantes/{id} → 204 si existía, 404 si no")
    void t4_delete() {
        try (AppSpring app = AppSpring.conServicios(VacanteController.class)) {
            Http.estado(app.delete("/api/vacantes/1"), 204, "Si se eliminó, responde ResponseEntity.noContent().build().");
            Http.estado(app.get("/api/vacantes/1"), 404, "Después de borrarla, la vacante 1 ya no debe existir.");
            Http.estado(app.delete("/api/vacantes/99"), 404, "Si no existe, responde ResponseEntity.notFound().build().");
        }
    }
}
