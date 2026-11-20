package curso.sim;
/** Una prueba que no se cumple. El mensaje se muestra al estudiante. */
public class Falla extends RuntimeException {
    public Falla(String m) { super(m); }
}
