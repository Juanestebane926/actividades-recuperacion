package com.curso.vacantes.model;

// Modelo de una vacante de la bolsa de empleo.
// (Este archivo ya está listo: no tienes que cambiarlo.)
public class Vacante {

    private Long id;
    private String titulo;
    private String empresa;
    private double salario;

    // Spring usa el constructor vacío + los setters para leer el JSON de un @RequestBody
    public Vacante() {
    }

    public Vacante(Long id, String titulo, String empresa, double salario) {
        this.id = id;
        this.titulo = titulo;
        this.empresa = empresa;
        this.salario = salario;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; }

    public double getSalario() { return salario; }
    public void setSalario(double salario) { this.salario = salario; }
}
