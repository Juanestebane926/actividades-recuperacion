package com.mycompany.recuperacion.util;

public class Calificaciones {

    // 1. Devuelve "Aprobado" si la nota es mayor o igual a 3.0; si no, "Reprobado".
    public static String estado(double nota) {
        if (nota ____ 3.0) {
            return "Aprobado";
        } else {
            return ____;
        }
    }

    // 2. Devuelve:
    //      "Excelente"     si la nota es 4.5 o más
    //      "Aceptable"     si la nota es 3.0 o más (pero menos de 4.5)
    //      "Insuficiente"  en cualquier otro caso
    public static String nivel(double nota) {
        if (nota >= 4.5) {
            return "Excelente";
        } else if (____) {
            return "Aceptable";
        } else {
            return "Insuficiente";
        }
    }
}
