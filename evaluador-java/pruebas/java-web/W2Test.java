package pruebas;

import static curso.soporte.Http.igual;

import com.mycompany.recuperacion.util.Estadisticas;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Paso 2: ciclos y arreglos. */
class W2Test {

    @Test
    @DisplayName("promedio() de varias notas")
    void t1_promedio() {
        igual(4.0, Estadisticas.promedio(new double[] { 4.0, 3.0, 5.0 }), "Estadisticas.promedio({4.0, 3.0, 5.0})");
        igual(3.5, Estadisticas.promedio(new double[] { 3.5 }), "Estadisticas.promedio({3.5})");
        igual(3.0, Estadisticas.promedio(new double[] { 2.0, 4.0, 1.0, 5.0 }), "Estadisticas.promedio({2.0, 4.0, 1.0, 5.0})");
    }

    @Test
    @DisplayName("promedio() de un arreglo vacío es 0")
    void t2_vacio() {
        igual(0.0, Estadisticas.promedio(new double[0]), "Estadisticas.promedio({})");
    }

    @Test
    @DisplayName("contarAprobados() cuenta las notas >= 3.0")
    void t3_contar() {
        igual(2, Estadisticas.contarAprobados(new double[] { 3.0, 2.9, 4.5, 1.0 }), "Estadisticas.contarAprobados({3.0, 2.9, 4.5, 1.0})");
        igual(0, Estadisticas.contarAprobados(new double[0]), "Estadisticas.contarAprobados({})");
        igual(3, Estadisticas.contarAprobados(new double[] { 5.0, 5.0, 5.0 }), "Estadisticas.contarAprobados({5.0, 5.0, 5.0})");
    }
}
