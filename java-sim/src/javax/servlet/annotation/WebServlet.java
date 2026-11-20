package javax.servlet.annotation;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target({ElementType.TYPE}) @Documented
public @interface WebServlet { String name() default ""; String[] value() default {}; String[] urlPatterns() default {}; }
