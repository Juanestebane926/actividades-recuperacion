package org.springframework.web.bind.annotation;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target({ElementType.TYPE, ElementType.METHOD}) @Documented
public @interface ResponseStatus { org.springframework.http.HttpStatus value() default org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR; org.springframework.http.HttpStatus code() default org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR; String reason() default ""; }
