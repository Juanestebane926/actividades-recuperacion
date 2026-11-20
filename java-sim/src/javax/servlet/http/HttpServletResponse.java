package javax.servlet.http;
import java.io.IOException;
import java.io.PrintWriter;
public interface HttpServletResponse {
    int SC_OK = 200, SC_CREATED = 201, SC_NO_CONTENT = 204, SC_BAD_REQUEST = 400, SC_UNAUTHORIZED = 401,
        SC_FORBIDDEN = 403, SC_NOT_FOUND = 404, SC_METHOD_NOT_ALLOWED = 405, SC_CONFLICT = 409,
        SC_INTERNAL_SERVER_ERROR = 500;
    void setStatus(int sc);
    int getStatus();
    void setContentType(String type);
    String getContentType();
    void setCharacterEncoding(String enc);
    String getCharacterEncoding();
    void setHeader(String name, String value);
    void addHeader(String name, String value);
    PrintWriter getWriter() throws IOException;
    void sendError(int sc, String msg) throws IOException;
    void sendError(int sc) throws IOException;
}
