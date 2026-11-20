#!/usr/bin/env bash
# Se ejecuta EN EL VPS (lo llama GitHub Actions por SSH). Carga la imagen nueva y reemplaza el contenedor.
# Límites pensados para no afectar a los demás servicios del VPS: 1,5 CPU, 900 MB de RAM, sin swap,
# sin JVM precalentadas y una evaluación a la vez.
# Variables: IMAGEN (etiqueta), DOCENTE_CLAVE.  Para quitarlo todo: docker rm -f recuperacion
set -euo pipefail
gunzip -c /tmp/recuperacion-imagen.tar.gz | nice -n 19 docker load | tail -1
rm -f /tmp/recuperacion-imagen.tar.gz
docker rm -f recuperacion >/dev/null 2>&1 || true
docker run -d --name recuperacion --restart unless-stopped \
  -p 127.0.0.1:3010:8080 -v recuperacion-datos:/datos \
  --cpus=1.5 --memory=900m --memory-swap=900m --pids-limit=400 \
  -e DOCENTE_CLAVE="$DOCENTE_CLAVE" -e ORIGENES=https://juanestebane926.github.io \
  -e POOL_SPRING=0 -e POOL_WEB=0 -e MAX_PARALELO=1 -e MEMORIA_JAVA=320m \
  --log-opt max-size=10m --log-opt max-file=2 \
  "$IMAGEN" >/dev/null
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3010/api/estado >/dev/null; then echo "Servidor en marcha: $IMAGEN"; break; fi
  sleep 2
done
curl -sf http://127.0.0.1:3010/api/estado
# Borra imágenes viejas de esta app (deja la que está corriendo)
docker images ghcr.io/juanestebane926/actividades-recuperacion --format '{{.Repository}}:{{.Tag}}' | grep -v "^$IMAGEN$" | xargs -r docker rmi >/dev/null 2>&1 || true
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' recuperacion
