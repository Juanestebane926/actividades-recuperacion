package curso.sim;
import java.io.*;
import javax.servlet.http.HttpServletResponse;
public class RespuestaFalsa implements HttpServletResponse {
    private int status = 200; private String tipo, enc;
    private final StringWriter sw = new StringWriter(); private final PrintWriter pw = new PrintWriter(sw);
    String ultimoContentType;
    public void setStatus(int sc) { status = sc; }
    public int getStatus() { return status; }
    public void setContentType(String t) { tipo = t; }
    public String getContentType() { return tipo; }
    public void setCharacterEncoding(String e) { enc = e; }
    public String getCharacterEncoding() { return enc; }
    public void setHeader(String n, String v) { }
    public void addHeader(String n, String v) { }
    public PrintWriter getWriter() { return pw; }
    public void sendError(int sc, String msg) { status = sc; pw.print(msg); }
    public void sendError(int sc) { status = sc; }
    String cuerpo() { pw.flush(); return sw.toString(); }
}
