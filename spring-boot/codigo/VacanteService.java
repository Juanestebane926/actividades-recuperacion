package com.curso.vacantes.service;

import com.curso.vacantes.model.Vacante;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

// 1. Marca esta clase como un servicio, para que Spring la cree y la pueda inyectar
@____
public class VacanteService {

    // Guardamos las vacantes en memoria (en clase usamos un repositorio JPA)
    private final List<Vacante> vacantes = new ArrayList<>();
    private long siguienteId = 4;

    public VacanteService() {
        vacantes.add(new Vacante(1L, "Desarrollador Java Junior", "TechCorp", 2500000));
        vacantes.add(new Vacante(2L, "Auxiliar de soporte", "SoftAndina", 1800000));
        vacantes.add(new Vacante(3L, "Practicante React", "TechCorp", 1300000));
    }

    // 2. Devuelve todas las vacantes
    public List<Vacante> listar() {
        return ____;
    }

    // 3. Busca la vacante con ese id. Si no existe, devuelve null.
    public Vacante buscarPorId(Long id) {
        for (Vacante v : vacantes) {
            if (v.getId().equals(____)) {
                return ____;
            }
        }
        return null;
    }

    // 4. Asigna el siguiente id, agrega la vacante a la lista y devuélvela
    public Vacante crear(Vacante nueva) {
        nueva.setId(siguienteId);
        siguienteId++;
        ____;
        return nueva;
    }

    // ---------------- PASO 6: buscar por empresa y eliminar ----------------

    // Devuelve las vacantes cuya empresa contiene el texto (sin importar mayúsculas)
    public List<Vacante> buscarPorEmpresa(String empresa) {
        List<Vacante> resultado = new ArrayList<>();
        // Escribe aquí tu código del paso 6
        return resultado;
    }

    // Elimina la vacante con ese id. Devuelve true si la encontró y la borró.
    public boolean eliminar(Long id) {
        // Escribe aquí tu código del paso 6 (reemplaza el return false)
        return false;
    }
}
