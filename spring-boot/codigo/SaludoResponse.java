package com.curso.vacantes.dto;

// DTO de respuesta: Spring (Jackson) lo convierte a JSON usando sus getters.
// Ejemplo: new SaludoResponse("Hola, Ana")  ->  {"mensaje":"Hola, Ana"}
// (Este archivo ya está listo: no tienes que cambiarlo.)
public class SaludoResponse {

    private String mensaje;

    public SaludoResponse(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getMensaje() {
        return mensaje;
    }
}
