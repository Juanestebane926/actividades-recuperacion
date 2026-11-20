package org.springframework.http;
import java.net.URI;
public class ResponseEntity<T> {
    private final int status; private final T body;
    public ResponseEntity(HttpStatus status) { this(null, status); }
    public ResponseEntity(T body, HttpStatus status) { this.body = body; this.status = status.value(); }
    private ResponseEntity(T body, int status) { this.body = body; this.status = status; }
    public T getBody() { return body; }
    public HttpStatus getStatusCode() { return HttpStatus.valueOf(status); }
    public int getStatusCodeValue() { return status; }
    public boolean hasBody() { return body != null; }
    public interface HeadersBuilder<B extends HeadersBuilder<B>> {
        B header(String name, String... values);
        <T> ResponseEntity<T> build();
    }
    public interface BodyBuilder extends HeadersBuilder<BodyBuilder> {
        <T> ResponseEntity<T> body(T body);
        BodyBuilder contentType(Object mediaType);
    }
    static class Builder implements BodyBuilder {
        private final int status;
        Builder(int s) { status = s; }
        public BodyBuilder header(String n, String... v) { return this; }
        public BodyBuilder contentType(Object m) { return this; }
        public <T> ResponseEntity<T> build() { return new ResponseEntity<T>(null, status); }
        public <T> ResponseEntity<T> body(T b) { return new ResponseEntity<T>(b, status); }
    }
    public static BodyBuilder status(HttpStatus s) { return new Builder(s.value()); }
    public static BodyBuilder status(int s) { return new Builder(s); }
    public static BodyBuilder ok() { return new Builder(200); }
    public static <T> ResponseEntity<T> ok(T body) { return new ResponseEntity<T>(body, 200); }
    public static BodyBuilder created(URI location) { return new Builder(201); }
    public static BodyBuilder accepted() { return new Builder(202); }
    public static HeadersBuilder<?> noContent() { return new Builder(204); }
    public static BodyBuilder badRequest() { return new Builder(400); }
    public static HeadersBuilder<?> notFound() { return new Builder(404); }
    public static BodyBuilder internalServerError() { return new Builder(500); }
    @Override public String toString() { return "<" + status + "," + body + ">"; }
}
