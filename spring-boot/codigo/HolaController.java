package com.curso.vacantes.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 1. Marca la clase como un controlador REST (responde peticiones HTTP)
@____
// 2. Todas las rutas de esta clase empiezan con /api
@RequestMapping("____")
public class HolaController {

    // 3. Este método atiende GET /api/hola
    @____("/hola")
    public String hola() {
        // 4. Devuelve exactamente el texto: Hola desde Spring Boot
        return ____;
    }
}
