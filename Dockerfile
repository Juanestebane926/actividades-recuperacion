# Servidor de las actividades de recuperación (Node 22 + JDK 21 + Spring Boot/Tomcat/JUnit reales).
#   docker build -t recuperacion .
#   docker run -d -p 8080:8080 -e DOCENTE_CLAVE=una-clave-larga -v recuperacion-datos:/datos --name recuperacion recuperacion

# 1) Librerías Java reales (Maven) y evaluador compilado
FROM maven:3.9-eclipse-temurin-21 AS java
WORKDIR /app/evaluador-java
COPY evaluador-java/ ./
RUN rm -rf build && MVN=mvn bash build.sh

# 2) Dependencias de Node (esbuild, jsdom, React, Testing Library, CodeMirror)
FROM node:22-bookworm-slim AS node
WORKDIR /app/servidor
COPY servidor/package.json servidor/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 3) Imagen final
FROM eclipse-temurin:21-jdk-jammy
COPY --from=node /usr/local/bin/node /usr/local/bin/node
# Usuario sin privilegios para ejecutar el código de los estudiantes: no puede leer ni escribir /datos
RUN useradd --system --uid 10001 --no-create-home sandbox
WORKDIR /app
COPY . .
COPY --from=java /app/evaluador-java/build ./evaluador-java/build
COPY --from=node /app/servidor/node_modules ./servidor/node_modules
RUN mkdir -p /datos && chmod 700 /datos
ENV PORT=8080 DATOS=/datos TRABAJOS=/tmp/trabajos SANDBOX_UID=10001 SANDBOX_GID=10001 NODE_ENV=production
EXPOSE 8080
VOLUME ["/datos"]
CMD ["node", "servidor/src/servidor.js"]
