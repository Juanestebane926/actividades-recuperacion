#!/data/data/com.termux/files/usr/bin/bash
# Compila el simulador (stubs de Spring/Servlet + evaluador) como Java 8 y lo empaqueta en assets/java/sim.jar
set -e
cd "$(dirname "$0")"
rm -rf build && mkdir build
javac --release 8 -nowarn -encoding UTF-8 -cp ../assets/java/tools.jar -d build $(find src -name '*.java')
(cd build && jar cf ../../assets/java/sim.jar .)
ls -la ../assets/java/sim.jar
