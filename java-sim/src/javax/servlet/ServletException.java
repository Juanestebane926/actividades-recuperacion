package javax.servlet;
public class ServletException extends Exception {
    public ServletException() { super(); }
    public ServletException(String m) { super(m); }
    public ServletException(String m, Throwable c) { super(m, c); }
    public ServletException(Throwable c) { super(c); }
}
