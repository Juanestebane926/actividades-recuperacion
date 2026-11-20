package curso.sim;
/** Resultado de una petición HTTP simulada. */
public class Respuesta {
    public final String metodo, url; public final int status; public final Object cuerpo; public final String texto;
    Respuesta(String metodo, String url, int status, Object cuerpo, String texto) {
        this.metodo = metodo; this.url = url; this.status = status; this.cuerpo = cuerpo; this.texto = texto;
    }
    /** El cuerpo como JSON ya interpretado (Map, List, String, Double...). */
    public Object json() {
        try { return Json.leer(texto); } catch (RuntimeException e) { throw new Falla("La respuesta de " + metodo + " " + url + " no es JSON válido: " + e.getMessage() + "\nRespuesta: " + texto); }
    }
    public String resumen() { return metodo + " " + url + "  →  " + status + "  " + (texto == null || texto.isEmpty() ? "(sin cuerpo)" : texto); }
}
