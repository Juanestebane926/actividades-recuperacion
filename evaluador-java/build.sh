#!/usr/bin/env bash
# Construye el evaluador Java real:
#   build/lib-spring, build/lib-web  -> librerías reales (Spring Boot 3, Tomcat 9, JUnit 5) descargadas con Maven
#   build/clases-spring, build/clases-web -> evaluador (nucleo) + soporte de cada curso
# Requiere JDK 17+ y Maven (variable MVN para usar uno que no esté en el PATH).
set -euo pipefail
cd "$(dirname "$0")"
MVN="${MVN:-mvn}"
SEP=':'
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) SEP=';' ;; esac

for curso in spring web; do
  if [ ! -d "build/lib-$curso" ] || [ "$curso/pom.xml" -nt "build/lib-$curso" ]; then
    rm -rf "build/lib-$curso"
    "$MVN" -q -f "$curso/pom.xml" dependency:copy-dependencies -DoutputDirectory="../build/lib-$curso" -DincludeScope=runtime
    touch "build/lib-$curso"
  fi
  rm -rf "build/clases-$curso"
  mkdir -p "build/clases-$curso"
  javac --release 17 -encoding UTF-8 -nowarn -cp "build/lib-$curso/*" -d "build/clases-$curso" \
    $(find nucleo/src soporte-comun/src "soporte-$curso/src" -name '*.java')
  echo "OK evaluador $curso"
done
