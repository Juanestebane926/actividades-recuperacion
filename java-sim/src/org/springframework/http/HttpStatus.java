package org.springframework.http;
public enum HttpStatus {
    OK(200, "OK"), CREATED(201, "Created"), ACCEPTED(202, "Accepted"), NO_CONTENT(204, "No Content"),
    BAD_REQUEST(400, "Bad Request"), UNAUTHORIZED(401, "Unauthorized"), FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Not Found"), METHOD_NOT_ALLOWED(405, "Method Not Allowed"), CONFLICT(409, "Conflict"),
    INTERNAL_SERVER_ERROR(500, "Internal Server Error");
    private final int value; private final String reason;
    HttpStatus(int v, String r) { value = v; reason = r; }
    public int value() { return value; }
    public String getReasonPhrase() { return reason; }
    public static HttpStatus valueOf(int code) {
        for (HttpStatus s : values()) if (s.value == code) return s;
        throw new IllegalArgumentException("Código HTTP no soportado en el simulador: " + code);
    }
}
