package org.springframework.web.bind.annotation;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target({ElementType.PARAMETER}) @Documented
public @interface PathVariable { String value() default ""; String name() default ""; boolean required() default true; }
