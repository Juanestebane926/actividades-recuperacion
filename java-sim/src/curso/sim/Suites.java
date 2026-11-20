package curso.sim;
import java.util.*;
public abstract class Suites {
    final LinkedHashMap<String, List<Object[]>> mapa = new LinkedHashMap<String, List<Object[]>>();
    protected void caso(String suite, String nombre, Caso c) {
        if (!mapa.containsKey(suite)) mapa.put(suite, new ArrayList<Object[]>());
        mapa.get(suite).add(new Object[] { nombre, c });
    }
}
