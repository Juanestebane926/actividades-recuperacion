package com.curso.vacantes.controller;

import com.curso.vacantes.dto.SaludoResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SaludoController {

    // GET /api/saludo?nombre=Ana  ->  {"mensaje":"Hola, Ana"}
    // GET /api/saludo             ->  {"mensaje":"Hola, invitado"}
    @GetMapping("/saludo")
    public SaludoResponse saludar(@____(defaultValue = "____") String nombre) {
        // Crea y devuelve un SaludoResponse con el texto "Hola, " + nombre
        return ____;
    }
}
