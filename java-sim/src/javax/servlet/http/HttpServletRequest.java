package javax.servlet.http;
import java.util.Map;
public interface HttpServletRequest {
    String getParameter(String name);
    Map<String, String[]> getParameterMap();
    String getMethod();
    String getRequestURI();
    String getQueryString();
    String getContentType();
    String getHeader(String name);
    void setCharacterEncoding(String enc);
    java.io.BufferedReader getReader() throws java.io.IOException;
}
