#!/data/data/com.termux/files/usr/bin/bash
# Compila el simulador (stubs de Spring/Servlet + evaluador) como Java 8 y lo empaqueta en assets/java/sim.jar
set -e
cd "$(dirname "$0")"
rm -rf build && mkdir build
javac --release 8 -nowarn -encoding UTF-8 -cp ../assets/java/tools.jar -d build $(find src -name '*.java')
(cd build && jar cf ../sim.jar .)
# El nombre lleva un hash: CheerpJ cachea los .jar, así cada versión nueva se descarga sí o sí
h=$(md5sum sim.jar | cut -c1-8)
rm -f ../assets/java/sim*.jar
mv sim.jar ../assets/java/sim-$h.jar
echo "window.SIM_JAR = 'sim-$h.jar';" > ../assets/java/sim-version.js
ls -la ../assets/java/
