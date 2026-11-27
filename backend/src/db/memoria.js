// ============================================================================
//  src/db/memoria.js — base de datos en memoria que imita al cliente de Prisma
//
//  ¿Por qué existe?
//   1. Pruebas (Jest): cada prueba parte de datos conocidos, sin internet ni
//      PostgreSQL, y corre en milisegundos.
//   2. Modo demo: si no hay DATABASE_URL en .env, el servidor arranca igual con
//      la semilla cargada aquí. Así el proyecto corre con solo `npm run dev`,
//      antes de crear la cuenta de Supabase.
//
//  Implementa SOLO la parte de la API de Prisma que usan los servicios:
//    modelo.findUnique / findFirst / findMany / count / create / update /
//    updateMany / delete / deleteMany, y $transaction.
//  Filtros soportados en `where`: igualdad, null, { in, notIn, lt, lte, gt,
//  gte, not, equals, contains (+ mode: 'insensitive') }, AND / OR / NOT y
//  filtros por relación (por ejemplo { reserva: { cancha: { duenoId: 3 } } }).
//  También `include` (anidado), `orderBy`, `skip` y `take`.
//
//  Si un servicio usa algo que este archivo no soporta, la prueba falla con un
//  error claro en vez de dar un resultado silenciosamente distinto a Prisma.
// ============================================================================

// Relaciones entre modelos: tipo, modelo destino y campos que las unen.
//  uno  → la fila actual guarda la clave foránea (belongsTo)
//  muchos / unoInverso → el modelo destino guarda la clave foránea
const RELACIONES = {
  usuario: {
    canchas: { tipo: 'muchos', modelo: 'cancha', foranea: 'duenoId' },
    reservas: { tipo: 'muchos', modelo: 'reserva', foranea: 'jugadorId' }
  },
  cancha: {
    dueno: { tipo: 'uno', modelo: 'usuario', local: 'duenoId' },
    tarifas: { tipo: 'muchos', modelo: 'tarifa', foranea: 'canchaId' },
    bloqueos: { tipo: 'muchos', modelo: 'bloqueo', foranea: 'canchaId' },
    reservas: { tipo: 'muchos', modelo: 'reserva', foranea: 'canchaId' }
  },
  tarifa: { cancha: { tipo: 'uno', modelo: 'cancha', local: 'canchaId' } },
  bloqueo: { cancha: { tipo: 'uno', modelo: 'cancha', local: 'canchaId' } },
  reserva: {
    cancha: { tipo: 'uno', modelo: 'cancha', local: 'canchaId' },
    jugador: { tipo: 'uno', modelo: 'usuario', local: 'jugadorId' },
    pagos: { tipo: 'muchos', modelo: 'pago', foranea: 'reservaId' },
    resena: { tipo: 'unoInverso', modelo: 'resena', foranea: 'reservaId' }
  },
  pago: { reserva: { tipo: 'uno', modelo: 'reserva', local: 'reservaId' } },
  resena: { reserva: { tipo: 'uno', modelo: 'reserva', local: 'reservaId' } },
  anuncio: {},
  imagenSitio: {}
};

// Valores por defecto (los mismos @default del schema.prisma).
const DEFECTOS = {
  usuario: () => ({ telefono: null, rol: 'JUGADOR', activo: true }),
  cancha: () => ({ descripcion: null, techada: false, conLuz: false, zona: null, telefono: null, fotos: [], qrPagoUrl: null, publicada: false }),
  tarifa: () => ({}),
  bloqueo: () => ({ motivo: 'OTRO', nota: null }),
  reserva: () => ({ estado: 'PENDIENTE_PAGO', expiraEn: null, adelantoPerdido: false, canceladaEn: null }),
  pago: () => ({ estado: 'PENDIENTE', nota: null, revisadoEn: null }),
  resena: () => ({ texto: null }),
  anuncio: () => ({ enlace: null, imagenUrl: null, zona: null, activo: true, impresiones: 0, clics: 0 }),
  imagenSitio: () => ({ titulo: null, credito: null, enlaceCredito: null, orden: 0, activa: true })
};

// Restricciones @unique / @@unique del schema.
const UNICOS = {
  usuario: [['email']],
  pago: [['metodo', 'numeroOperacion']],
  resena: [['reservaId']]
};

// Con estos modelos no se puede borrar una fila si otra la referencia
// (onDelete: Restrict en el schema).
const RESTRICCIONES = {
  usuario: [['cancha', 'duenoId'], ['reserva', 'jugadorId']],
  cancha: [['reserva', 'canchaId']]
};
// Y estos se borran en cascada (onDelete: Cascade).
const CASCADAS = {
  cancha: [['tarifa', 'canchaId'], ['bloqueo', 'canchaId']],
  reserva: [['pago', 'reservaId'], ['resena', 'reservaId']]
};

// Errores con el mismo `code` que usa Prisma, para que el manejador central
// los traduzca igual en pruebas y en producción.
function errorPrisma(code, mensaje) {
  const e = new Error(mensaje);
  e.code = code;
  e.name = 'PrismaClientKnownRequestError';
  return e;
}

// Copia profunda que respeta fechas (JSON.parse las volvería texto).
function copiar(v) {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(copiar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copiar(x)]));
  return v;
}

const comparable = v => (v instanceof Date ? v.getTime() : v);

function crearMemoria() {
  let tablas = {};
  let contadores = {};

  const filas = modelo => (tablas[modelo] ||= []);

  // ¿El valor de un campo cumple la condición de Prisma?
  function cumpleCampo(valor, cond) {
    if (cond === null) return valor === null || valor === undefined;
    if (cond instanceof Date || typeof cond !== 'object') return comparable(valor) === comparable(cond);
    const v = comparable(valor);
    for (const [op, arg] of Object.entries(cond)) {
      const a = comparable(arg);
      switch (op) {
        case 'equals': if (v !== a) return false; break;
        case 'not': if (arg !== null && typeof arg === 'object' && !(arg instanceof Date) ? cumpleCampo(valor, arg) : v === a) return false; break;
        case 'in': if (!arg.map(comparable).includes(v)) return false; break;
        case 'notIn': if (arg.map(comparable).includes(v)) return false; break;
        case 'lt': if (!(v !== null && v !== undefined && v < a)) return false; break;
        case 'lte': if (!(v !== null && v !== undefined && v <= a)) return false; break;
        case 'gt': if (!(v !== null && v !== undefined && v > a)) return false; break;
        case 'gte': if (!(v !== null && v !== undefined && v >= a)) return false; break;
        case 'contains': {
          if (typeof valor !== 'string') return false;
          const insensible = cond.mode === 'insensitive';
          if (!(insensible ? valor.toLowerCase().includes(String(arg).toLowerCase()) : valor.includes(arg))) return false;
          break;
        }
        case 'mode': break;
        default: throw new Error(`memoria: operador "${op}" no soportado`);
      }
    }
    return true;
  }

  // ¿La fila cumple todo el `where`?
  function cumple(modelo, fila, where = {}) {
    if (!where) return true;
    for (const [clave, cond] of Object.entries(where)) {
      if (cond === undefined) continue; // Prisma ignora los undefined
      if (clave === 'AND') { if (![].concat(cond).every(w => cumple(modelo, fila, w))) return false; continue; }
      if (clave === 'OR') { if (!cond.some(w => cumple(modelo, fila, w))) return false; continue; }
      if (clave === 'NOT') { if ([].concat(cond).some(w => cumple(modelo, fila, w))) return false; continue; }
      const rel = RELACIONES[modelo]?.[clave];
      if (rel) {
        if (!cumpleRelacion(fila, rel, cond)) return false;
        continue;
      }
      if (!cumpleCampo(fila[clave], cond)) return false;
    }
    return true;
  }

  function relacionadas(fila, rel) {
    if (rel.tipo === 'uno') return filas(rel.modelo).filter(f => f.id === fila[rel.local]);
    return filas(rel.modelo).filter(f => f[rel.foranea] === fila.id);
  }

  function cumpleRelacion(fila, rel, cond) {
    const hijos = relacionadas(fila, rel);
    if (rel.tipo === 'muchos') {
      if (cond.some) return hijos.some(h => cumple(rel.modelo, h, cond.some));
      if (cond.none) return !hijos.some(h => cumple(rel.modelo, h, cond.none));
      if (cond.every) return hijos.every(h => cumple(rel.modelo, h, cond.every));
      throw new Error('memoria: en relaciones "muchos" usa some / none / every');
    }
    if (cond === null) return hijos.length === 0;
    const filtro = cond.is ?? cond;
    return hijos.length > 0 && cumple(rel.modelo, hijos[0], filtro);
  }

  // Agrega a la fila las relaciones pedidas en `include`.
  function incluir(modelo, fila, include) {
    const salida = copiar(fila);
    if (!include) return salida;
    for (const [clave, opc] of Object.entries(include)) {
      if (!opc) continue;
      const rel = RELACIONES[modelo]?.[clave];
      if (!rel) throw new Error(`memoria: relación "${modelo}.${clave}" no existe`);
      const sub = typeof opc === 'object' ? opc : {};
      let hijos = relacionadas(fila, rel);
      if (sub.where) hijos = hijos.filter(h => cumple(rel.modelo, h, sub.where));
      if (sub.orderBy) hijos = ordenar(hijos, sub.orderBy);
      hijos = hijos.map(h => incluir(rel.modelo, h, sub.include));
      salida[clave] = rel.tipo === 'muchos' ? hijos : hijos[0] || null;
    }
    return salida;
  }

  function ordenar(lista, orderBy) {
    const criterios = [].concat(orderBy).flatMap(o => Object.entries(o));
    return [...lista].sort((x, y) => {
      for (const [campo, dir] of criterios) {
        const a = comparable(x[campo]);
        const b = comparable(y[campo]);
        if (a === b) continue;
        const r = a > b ? 1 : -1;
        return dir === 'desc' ? -r : r;
      }
      return 0;
    });
  }

  function revisarUnicos(modelo, fila, ignorarId) {
    for (const campos of UNICOS[modelo] || []) {
      const choque = filas(modelo).find(f => f.id !== ignorarId && campos.every(c => f[c] === fila[c]));
      if (choque) throw errorPrisma('P2002', `Unique constraint failed on the fields: (${campos.join(', ')})`);
    }
  }

  function buscarPorId(modelo, where) {
    const claves = Object.keys(where);
    // findUnique acepta id o un campo @unique simple (email, reservaId…)
    if (claves.length !== 1) throw new Error('memoria: findUnique espera un solo campo único');
    return filas(modelo).find(f => cumple(modelo, f, where));
  }

  // Normaliza los datos de entrada: fechas como Date y Decimal como número.
  function normalizar(data) {
    const salida = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        if ('increment' in v) { salida[k] = { __incremento: v.increment }; continue; }
        if ('set' in v) { salida[k] = v.set; continue; }
        throw new Error(`memoria: escritura anidada en "${k}" no soportada`);
      }
      salida[k] = copiar(v);
    }
    return salida;
  }

  function aplicar(fila, data) {
    for (const [k, v] of Object.entries(normalizar(data))) {
      fila[k] = v && v.__incremento !== undefined ? (fila[k] || 0) + v.__incremento : v;
    }
  }

  function crearModelo(modelo) {
    return {
      async findUnique({ where, include } = {}) {
        const f = buscarPorId(modelo, where);
        return f ? incluir(modelo, f, include) : null;
      },
      async findUniqueOrThrow(args) {
        const f = await this.findUnique(args);
        if (!f) throw errorPrisma('P2025', 'No record was found');
        return f;
      },
      async findFirst({ where, include, orderBy } = {}) {
        let lista = filas(modelo).filter(f => cumple(modelo, f, where));
        if (orderBy) lista = ordenar(lista, orderBy);
        return lista[0] ? incluir(modelo, lista[0], include) : null;
      },
      async findMany({ where, include, orderBy, skip = 0, take } = {}) {
        let lista = filas(modelo).filter(f => cumple(modelo, f, where));
        if (orderBy) lista = ordenar(lista, orderBy);
        lista = lista.slice(skip, take === undefined ? undefined : skip + take);
        return lista.map(f => incluir(modelo, f, include));
      },
      async count({ where } = {}) {
        return filas(modelo).filter(f => cumple(modelo, f, where)).length;
      },
      async create({ data, include }) {
        const id = data.id ?? (contadores[modelo] = (contadores[modelo] || 0) + 1);
        if (data.id) contadores[modelo] = Math.max(contadores[modelo] || 0, data.id);
        const fila = { id, ...DEFECTOS[modelo](), creadoEn: new Date(), ...normalizar(data) };
        revisarUnicos(modelo, fila, null);
        filas(modelo).push(fila);
        return incluir(modelo, fila, include);
      },
      async update({ where, data, include }) {
        const fila = buscarPorId(modelo, where);
        if (!fila) throw errorPrisma('P2025', 'Record to update not found.');
        const prueba = { ...fila };
        aplicar(prueba, data);
        revisarUnicos(modelo, prueba, fila.id);
        Object.assign(fila, prueba);
        return incluir(modelo, fila, include);
      },
      async updateMany({ where, data }) {
        const lista = filas(modelo).filter(f => cumple(modelo, f, where));
        lista.forEach(f => aplicar(f, data));
        return { count: lista.length };
      },
      async delete({ where }) {
        const fila = buscarPorId(modelo, where);
        if (!fila) throw errorPrisma('P2025', 'Record to delete does not exist.');
        for (const [otro, campo] of RESTRICCIONES[modelo] || []) {
          if (filas(otro).some(f => f[campo] === fila.id)) throw errorPrisma('P2003', `Foreign key constraint failed on the field: ${campo}`);
        }
        for (const [otro, campo] of CASCADAS[modelo] || []) {
          const hijos = filas(otro).filter(f => f[campo] === fila.id);
          for (const h of hijos) await api[otro].delete({ where: { id: h.id } });
        }
        tablas[modelo] = filas(modelo).filter(f => f !== fila);
        return copiar(fila);
      },
      async deleteMany({ where } = {}) {
        const lista = filas(modelo).filter(f => cumple(modelo, f, where));
        for (const f of lista) await api[modelo].delete({ where: { id: f.id } });
        return { count: lista.length };
      }
    };
  }

  const api = {
    motor: 'memoria',
    // $transaction: con función, la ejecuta con este mismo cliente y, si
    // falla, restaura la copia previa (imita el ROLLBACK). Con arreglo de
    // promesas, las espera en orden.
    async $transaction(arg) {
      if (Array.isArray(arg)) return Promise.all(arg);
      const respaldo = copiar(tablas);
      const respaldoContadores = { ...contadores };
      try {
        return await arg(api);
      } catch (e) {
        tablas = respaldo;
        contadores = respaldoContadores;
        throw e;
      }
    },
    async $connect() {},
    async $disconnect() {},
    // Solo para pruebas: deja la base vacía.
    reiniciar() {
      tablas = {};
      contadores = {};
    }
  };
  for (const modelo of Object.keys(RELACIONES)) api[modelo] = crearModelo(modelo);
  return api;
}

module.exports = { crearMemoria };
