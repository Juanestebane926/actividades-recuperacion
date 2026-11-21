// Base de datos SQLite (incluida en Node, sin dependencias): estudiantes, avance, intentos y notas.
// El estudiante se identifica con su correo (uno por actividad); no hay PIN.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATOS } from './config.js';

fs.mkdirSync(DATOS, { recursive: true });
export const db = new DatabaseSync(path.join(DATOS, 'actividades.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS estudiantes (
    id INTEGER PRIMARY KEY,
    actividad TEXT NOT NULL,
    correo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL DEFAULT '',
    token TEXT NOT NULL UNIQUE,
    creado INTEGER NOT NULL,
    ultimo INTEGER NOT NULL,
    UNIQUE (actividad, correo)
  );
  CREATE TABLE IF NOT EXISTS progreso (
    estudiante_id INTEGER PRIMARY KEY REFERENCES estudiantes(id) ON DELETE CASCADE,
    estado TEXT NOT NULL,
    actualizado INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS intentos (
    id INTEGER PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    paso TEXT NOT NULL,
    modo TEXT NOT NULL,
    ok INTEGER, total INTEGER, ms INTEGER,
    creado INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS intentos_est ON intentos (estudiante_id);
  CREATE TABLE IF NOT EXISTS entregas (
    id INTEGER PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    nota REAL NOT NULL,
    detalle TEXT NOT NULL,
    archivos TEXT NOT NULL,
    creado INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS entregas_est ON entregas (estudiante_id);
`);

// Migración de las bases creadas con documento + PIN: doc pasa a ser correo, se agrega apellido y se quita el PIN.
// Los registros viejos conservan su documento en la columna correo.
{
  const columnas = new Set(db.prepare('PRAGMA table_info(estudiantes)').all().map(c => c.name));
  if (columnas.has('doc') && !columnas.has('correo')) db.exec('ALTER TABLE estudiantes RENAME COLUMN doc TO correo');
  if (!columnas.has('apellido')) db.exec("ALTER TABLE estudiantes ADD COLUMN apellido TEXT NOT NULL DEFAULT ''");
  if (columnas.has('pin')) db.exec('ALTER TABLE estudiantes DROP COLUMN pin');
}

const q = {
  porCorreo: db.prepare('SELECT * FROM estudiantes WHERE actividad = ? AND correo = ?'),
  porToken: db.prepare('SELECT * FROM estudiantes WHERE token = ?'),
  porId: db.prepare('SELECT * FROM estudiantes WHERE id = ?'),
  crear: db.prepare('INSERT INTO estudiantes (actividad, correo, nombre, apellido, token, creado, ultimo) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  tocar: db.prepare('UPDATE estudiantes SET ultimo = ? WHERE id = ?'),
  leerProgreso: db.prepare('SELECT estado FROM progreso WHERE estudiante_id = ?'),
  guardarProgreso: db.prepare(`INSERT INTO progreso (estudiante_id, estado, actualizado) VALUES (?, ?, ?)
    ON CONFLICT (estudiante_id) DO UPDATE SET estado = excluded.estado, actualizado = excluded.actualizado`),
  intento: db.prepare('INSERT INTO intentos (estudiante_id, paso, modo, ok, total, ms, creado) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  entrega: db.prepare('INSERT INTO entregas (estudiante_id, nota, detalle, archivos, creado) VALUES (?, ?, ?, ?, ?)'),
  entregas: db.prepare('SELECT id, nota, detalle, creado FROM entregas WHERE estudiante_id = ? ORDER BY id DESC'),
  entrega1: db.prepare('SELECT * FROM entregas WHERE id = ?'),
  intentosDe: db.prepare('SELECT paso, modo, ok, total, ms, creado FROM intentos WHERE estudiante_id = ? ORDER BY id DESC LIMIT 300'),
  // Comprobaciones que no pasaron todas las pruebas (las que desbloquean pistas)
  fallos: db.prepare(`SELECT paso, COUNT(*) AS n FROM intentos
    WHERE estudiante_id = ? AND modo = 'comprobar' AND (ok IS NULL OR total IS NULL OR ok < total) GROUP BY paso`),
  resumen: db.prepare(`
    SELECT e.id, e.actividad, e.correo, e.nombre, e.apellido, e.creado, e.ultimo, p.estado,
      (SELECT nota FROM entregas WHERE estudiante_id = e.id ORDER BY id DESC LIMIT 1) AS ultima_nota,
      (SELECT creado FROM entregas WHERE estudiante_id = e.id ORDER BY id DESC LIMIT 1) AS ultima_fecha,
      (SELECT MAX(nota) FROM entregas WHERE estudiante_id = e.id) AS mejor_nota,
      (SELECT COUNT(*) FROM entregas WHERE estudiante_id = e.id) AS n_entregas,
      (SELECT COUNT(*) FROM intentos WHERE estudiante_id = e.id AND modo = 'comprobar') AS n_comprobar,
      (SELECT COUNT(*) FROM intentos WHERE estudiante_id = e.id AND modo = 'ejecutar') AS n_ejecutar
    FROM estudiantes e LEFT JOIN progreso p ON p.estudiante_id = e.id
    ORDER BY e.actividad, e.apellido COLLATE NOCASE, e.nombre COLLATE NOCASE`),
  borrar: db.prepare('DELETE FROM estudiantes WHERE id = ?'),
};

export const nuevoToken = () => crypto.randomBytes(24).toString('base64url');

export const Estudiantes = {
  porCorreo: (act, correo) => q.porCorreo.get(act, correo),
  porToken: t => q.porToken.get(t),
  porId: id => q.porId.get(id),
  crear(act, correo, nombre, apellido) {
    const ahora = Date.now(), token = nuevoToken();
    const r = q.crear.run(act, correo, nombre, apellido, token, ahora, ahora);
    return q.porId.get(Number(r.lastInsertRowid));
  },
  tocar: id => q.tocar.run(Date.now(), id),
  borrar: id => q.borrar.run(id),
};

export const Progreso = {
  leer(id) { const r = q.leerProgreso.get(id); return r ? JSON.parse(r.estado) : null; },
  guardar(id, estado) { q.guardarProgreso.run(id, JSON.stringify(estado), Date.now()); },
};

export const Intentos = {
  registrar: (id, paso, modo, ok, total, ms) => q.intento.run(id, paso, modo, ok ?? null, total ?? null, ms ?? null, Date.now()),
  de: id => q.intentosDe.all(id),
  /** { idPaso: comprobaciones fallidas } */
  fallos(id) { const r = {}; for (const f of q.fallos.all(id)) r[f.paso] = f.n; return r; },
};

export const Entregas = {
  guardar: (id, nota, detalle, archivos) => Number(q.entrega.run(id, nota, JSON.stringify(detalle), JSON.stringify(archivos), Date.now()).lastInsertRowid),
  de: id => q.entregas.all(id).map(e => ({ ...e, detalle: JSON.parse(e.detalle) })),
  una(id) { const e = q.entrega1.get(id); return e && { ...e, detalle: JSON.parse(e.detalle), archivos: JSON.parse(e.archivos) }; },
};

export const resumen = () => q.resumen.all();
