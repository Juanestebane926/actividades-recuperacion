package curso.sim;
import java.io.*;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
public class PeticionFalsa implements HttpServletRequest {
    private final String metodo; private final Map<String, String[]> params = new LinkedHashMap<String, String[]>();
    PeticionFalsa(String metodo, String... kv) {
        this.metodo = metodo;
        for (int i = 0; i + 1 < kv.length; i += 2) params.put(kv[i], new String[] { kv[i + 1] });
    }
    String consulta() {
        if (params.isEmpty()) return "";
        StringBuilder b = new StringBuilder("?");
        for (Map.Entry<String, String[]> e : params.entrySet()) { if (b.length() > 1) b.append('&'); b.append(e.getKey()).append('=').append(e.getValue()[0]); }
        return b.toString();
    }
    public String getParameter(String n) { String[] v = params.get(n); return v == null ? null : v[0]; }
    public Map<String, String[]> getParameterMap() { return params; }
    public String getMethod() { return metodo; }
    public String getRequestURI() { return "/api/estudiantes"; }
    public String getQueryString() { String q = consulta(); return q.isEmpty() ? null : q.substring(1); }
    public String getContentType() { return "application/x-www-form-urlencoded"; }
    public String getHeader(String n) { return null; }
    public void setCharacterEncoding(String e) { }
    public BufferedReader getReader() { return new BufferedReader(new StringReader("")); }
}
