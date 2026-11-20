package javax.servlet.http;
import java.io.IOException;
import javax.servlet.ServletException;
public abstract class HttpServlet {
    public void init() throws ServletException { }
    public void destroy() { }
    private void noPermitido(HttpServletResponse resp) throws IOException {
        resp.setStatus(405);
        resp.getWriter().print("{\"mensaje\":\"Metodo no permitido (no implementaste este metodo)\"}");
    }
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { noPermitido(resp); }
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { noPermitido(resp); }
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { noPermitido(resp); }
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { noPermitido(resp); }
    public void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String m = req.getMethod();
        if ("GET".equals(m)) doGet(req, resp);
        else if ("POST".equals(m)) doPost(req, resp);
        else if ("PUT".equals(m)) doPut(req, resp);
        else if ("DELETE".equals(m)) doDelete(req, resp);
        else noPermitido(resp);
    }
}
