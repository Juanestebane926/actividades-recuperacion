package com.mycompany.recuperacion.model;

public class Estudiante {

    // Atributos privados: solo se leen con los getters
    private String nombre;
    private int edad;
    private double nota;

    // 1. Constructor: guarda los valores recibidos en los atributos
    public Estudiante(String nombre, int edad, double nota) {
        this.nombre = nombre;
        this.edad = ____;
        this.nota = ____;
    }

    // 2. Getters
    public String getNombre() {
        return nombre;
    }

    public int getEdad() {
        return ____;
    }

    public double getNota() {
        return ____;
    }

    // 3. "Aprobado" si la nota es >= 3.0; si no, "Reprobado"
    public String getEstadoAcademico() {
        if (____) {
            return "Aprobado";
        }
        return "Reprobado";
    }

    // 4. Convierte el objeto a JSON, por ejemplo:
    //    {"nombre":"Ana","edad":18,"nota":4.6,"estado":"Aprobado"}
    @Override
    public String toString() {
        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"nombre\":\"").append(nombre).append("\",");
        json.append("\"edad\":").append(edad).append(",");
        json.append("\"nota\":").append(____).append(",");
        json.append("\"estado\":\"").append(____).append("\"");
        json.append("}");
        return json.toString();
    }
}
