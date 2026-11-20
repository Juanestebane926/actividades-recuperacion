// Configuración del servidor (todo se puede cambiar con variables de entorno).
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(aqui, '..', '..');            // raíz del repositorio (sitio estático)
export const SERVIDOR = path.resolve(aqui, '..');              // carpeta servidor/
export const EVALUADOR_JAVA = path.join(RAIZ, 'evaluador-java');

const env = process.env;
export const PUERTO = Number(env.PORT || env.PUERTO || 8080);
export const HOST = env.HOST || '0.0.0.0';
export const DATOS = path.resolve(env.DATOS || path.join(SERVIDOR, 'datos'));
export const JAVA = env.JAVA || 'java';
export const NODE = process.execPath;
export const MAX_PARALELO = Math.max(1, Number(env.MAX_PARALELO || os.cpus().length));
export const POOL = { spring: Number(env.POOL_SPRING ?? 1), web: Number(env.POOL_WEB ?? 1) };
export const MEMORIA_JAVA = env.MEMORIA_JAVA || '384m';
// En Linux (Docker) el código de los estudiantes corre con otro usuario sin permisos sobre la base de datos
export const SANDBOX = env.SANDBOX_UID ? { uid: Number(env.SANDBOX_UID), gid: Number(env.SANDBOX_GID || env.SANDBOX_UID) } : null;

let clave = env.DOCENTE_CLAVE;
export const CLAVE_GENERADA = !clave;
if (!clave) clave = crypto.randomBytes(6).toString('base64url');
export const DOCENTE_CLAVE = clave;
export const SECRETO = crypto.createHash('sha256').update('sesiones:' + (env.SECRETO || clave)).digest();

export const TIEMPOS = { comprobar: 60_000, ejecutar: 45_000, calificar: 180_000 };
