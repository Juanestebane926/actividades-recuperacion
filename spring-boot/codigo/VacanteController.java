package com.curso.vacantes.controller;

import com.curso.vacantes.model.Vacante;
import com.curso.vacantes.service.VacanteService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
// 1. Ruta base de este controller: /api/vacantes
@RequestMapping("____")
public class VacanteController {

    private final VacanteService vacanteService;

    // 2. Inyección por constructor: Spring te entrega el servicio. ¡No uses new!
    public VacanteController(VacanteService vacanteService) {
        this.vacanteService = ____;
    }

    // 3. GET /api/vacantes  ->  lista completa (el service ya sabe listar).
    //    En el paso 6 le agregarás el filtro ?empresa=
    @GetMapping
    public List<Vacante> listar() {
        return ____;
    }

    // 4. GET /api/vacantes/{id}  ->  200 con la vacante, o 404 si no existe
    @GetMapping("/{id}")
    public ResponseEntity<Vacante> buscarPorId(@____ Long id) {
        Vacante vacante = vacanteService.buscarPorId(id);
        if (vacante == null) {
            return ResponseEntity.____().build();
        }
        return ResponseEntity.ok(____);
    }

    // ---------------- PASO 5: crear vacantes ----------------
    // POST /api/vacantes  ->  201 con la vacante creada, o 400 si falta el título
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Vacante vacante) {
        // Escribe aquí tu código del paso 5 (reemplaza el return null)
        return null;
    }

    // ---------------- PASO 6: eliminar vacantes ----------------
    // Escribe aquí el endpoint DELETE /api/vacantes/{id}

}
