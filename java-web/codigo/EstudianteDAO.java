package com.mycompany.recuperacion.dao;

import com.mycompany.recuperacion.model.Estudiante;
import java.util.ArrayList;
import java.util.List;

// DAO = Data Access Object: la única clase que sabe DÓNDE se guardan los estudiantes.
// En clase lo hicimos con MySQL y JDBC; aquí los guardamos en un ArrayList en memoria.
public class EstudianteDAO {

    // 1. Crea la lista vacía de estudiantes
    private final List<Estudiante> estudiantes = new ____<>();

    // 2. Agrega el estudiante a la lista
    public void agregar(Estudiante estudiante) {
        ____;
    }

    public List<Estudiante> listar() {
        return estudiantes;
    }

    // 3. Cuántos estudiantes hay
    public int total() {
        return estudiantes.____();
    }

    // 4. Busca por nombre SIN importar mayúsculas ("ana" encuentra a "Ana").
    //    Si no existe, devuelve null.
    public Estudiante buscarPorNombre(String nombre) {
        for (Estudiante e : estudiantes) {
            if (e.getNombre().____(nombre)) {
                return e;
            }
        }
        return null;
    }

    // (Ya está lista) Devuelve las notas en un arreglo, útil para las estadísticas
    public double[] notas() {
        double[] notas = new double[estudiantes.size()];
        for (int i = 0; i < estudiantes.size(); i++) {
            notas[i] = estudiantes.get(i).getNota();
        }
        return notas;
    }
}
