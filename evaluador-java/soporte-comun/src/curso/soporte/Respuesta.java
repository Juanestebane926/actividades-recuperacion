package curso.soporte;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import curso.eval.Mensajes;

/** Respuesta HTTP real que produjo la aplicación del estudiante. */
public class Respuesta {
    static final ObjectMapper JSON = new ObjectMapper();

    public final String metodo, url;
    public final int status;
    public final String cuerpo, contentType;
    /** Excepción que explica la respuesta (la que lanzó el código o la que resolvió Spring), si la hay. */
    public final Throwable excepcion;

    public Respuesta(String metodo, String url, int status, String cuerpo, String contentType, Throwable excepcion) {
        this.metodo = metodo; this.url = url; this.status = status;
        this.cuerpo = cuerpo == null ? "" : cuerpo; this.contentType = contentType; this.excepcion = excepcion;
    }

    public String texto() { return cuerpo.trim(); }

    /** El cuerpo leído como JSON. Si no es JSON válido, la prueba falla explicando por qué. */
    public JsonNode json() {
        JsonNode n;
        try {
            n = JSON.readTree(cuerpo);
        } catch (Exception e) {
            throw new AssertionError(metodo + " " + url + " (respondió " + status + ") no devolvió JSON válido." + motivo()
                    + "\n   Error al leerlo: " + e.getMessage().split("\n")[0] + "\n   Cuerpo recibido: " + recorte(cuerpo));
        }
        if (n == null || n.isMissingNode()) {
            throw new AssertionError(metodo + " " + url + " respondió " + status + " con el cuerpo vacío y se esperaba JSON." + motivo());
        }
        return n;
    }

    static String recorte(String s) { return s.length() > 400 ? s.substring(0, 400) + "…" : s; }

    static String sangrar(String s) { return s.replace("\n", "\n   "); }

    /** Por qué la respuesta fue la que fue (excepción del código del estudiante o motivo que dio el framework). */
    public String motivo() {
        StringBuilder b = new StringBuilder();
        if (excepcion != null && Mensajes.dondeOcurrio(excepcion) != null) {
            b.append("\n   Tu código lanzó: ").append(sangrar(Mensajes.excepcion(excepcion)));
            if (status < 500) b.append("\n   (La respuesta ya se había empezado a enviar cuando ocurrió la excepción; por eso el código no es 500.)");
        } else if (excepcion != null) {
            String n = excepcion.getClass().getSimpleName();
            if (status == 404 && (n.equals("NoResourceFoundException") || n.equals("NoHandlerFoundException"))) {
                b.append("\n   Spring no tiene ningún método que atienda ").append(metodo).append(' ').append(ruta())
                 .append(". Revisa @RestController, la ruta de @RequestMapping de la clase y la del método.");
            } else if (n.equals("HttpRequestMethodNotSupportedException")) {
                b.append("\n   Spring dijo: ").append(excepcion.getMessage())
                 .append(". La ruta existe, pero ningún método la atiende con ").append(metodo).append('.');
            } else if (status >= 500) {
                b.append("\n   Excepción: ").append(sangrar(Mensajes.excepcion(excepcion)));
            } else {
                b.append("\n   Spring dijo (").append(n).append("): ").append(excepcion.getMessage());
            }
        } else if (status == 404 && cuerpo.isBlank()) {
            b.append("\n   Nadie atiende la ruta ").append(ruta()).append(": revisa la ruta de la anotación (@WebServlet / @RequestMapping).");
        } else if (!cuerpo.isBlank() && status >= 400) {
            b.append("\n   Cuerpo de la respuesta: ").append(recorte(cuerpo));
        }
        return b.toString();
    }

    String ruta() { int i = url.indexOf('?'); return i < 0 ? url : url.substring(0, i); }

    @Override public String toString() { return metodo + " " + url + " → " + status; }
}
