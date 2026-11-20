package org.springframework.web.bind.annotation;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target({ElementType.PARAMETER}) @Documented
public @interface RequestBody { boolean required() default true; }
