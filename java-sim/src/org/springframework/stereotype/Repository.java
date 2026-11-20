package org.springframework.stereotype;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target({ElementType.TYPE}) @Documented
public @interface Repository { String value() default ""; }
