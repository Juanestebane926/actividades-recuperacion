#!/data/data/com.termux/files/usr/bin/bash
# Uso: probar-local.sh <spring|web> <suites> <dir-con-.java>
d=$(mktemp -d); cp=$(cd "$(dirname "$0")/.." && pwd)/assets/java/sim.jar
java -cp "$cp" curso.sim.Ejecutor $d/out.txt $1 $2 "$cp" $d/clases $(ls $3/*.java) 
cat $d/out.txt
