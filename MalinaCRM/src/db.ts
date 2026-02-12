import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("malina_crm.db");

/* =========================
   SAFE SYNC RUNNER (no runSync)
========================= */

type BindParams = any[] | Record<string, any> | undefined;

function run(sql: string, params?: BindParams) {
  const stmt = db.prepareSync(sql);
  try {
    stmt.executeSync(params);
  } finally {
    stmt.finalizeSync();
  }
}

/* =========================
   TYPES
========================= */

export type UserRole = "admin" | "member";

export type User = {
  id: number;
  login: string;
  password: string;
  role: UserRole;
};

export type Order = {
  id: number;
  title: string;
  startAtISO: string;
  departAtISO: string | null;
  officeArriveAtISO: string | null;

  kidsCount: number | null;
  kidsAge: string | null;
  birthdayName: string | null;

  address: string | null;

  priceTotal: number | null;
  prepayment: number | null;

  participants: number[]; // TEXT(JSON) in DB
  description: string | null;
  costume: string | null;
  createdAtISO: string;
};

/* =========================
   INIT DB
========================= */

export function initDb() {
  // 1) USERS table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member'
    );
  `);

  // 2) Migration (если role не было)
  try {
    db.execSync(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';`);
  } catch {}

  // 3) Seed users
  db.execSync(`
    INSERT OR IGNORE INTO users (login, password, role) VALUES
    ('Malina', '0000', 'admin'),
    ('Malina1', '0000', 'member'),
    ('Malina2', '0000', 'member');
  `);

  // 4) Normalize roles (на всякий случай)
  db.execSync(`UPDATE users SET role = 'admin' WHERE login = 'Malina';`);
  db.execSync(`UPDATE users SET role = 'member' WHERE login IN ('Malina1','Malina2');`);

  // 5) ORDERS table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      startAtISO TEXT NOT NULL,
      departAtISO TEXT,
      officeArriveAtISO TEXT,

      kidsCount INTEGER,
      kidsAge TEXT,
      birthdayName TEXT,
      address TEXT,

      priceTotal REAL,
      prepayment REAL,

      participants TEXT,
      description TEXT,
      costume TEXT,
      createdAtISO TEXT NOT NULL
    );
  `);
}

/* =========================
   USERS
========================= */

export function getUsers(): User[] {
  initDb();
  return db.getAllSync<User>("SELECT * FROM users ORDER BY id");
}

export function checkLogin(login: string, password: string): User | null {
  initDb();
  const res = db.getAllSync<User>(
    "SELECT * FROM users WHERE login = ? AND password = ? LIMIT 1",
    [login, password]
  );
  return res[0] ?? null;
}

export function usersByIds(ids: number[]): User[] {
  initDb();
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return db.getAllSync<User>(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
}

/* =========================
   ORDERS
========================= */

function toISO(dateYMD: string, timeHM: string) {
  const [y, m, d] = dateYMD.split("-").map(Number);
  const [hh, mm] = timeHM.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

function parseParticipants(raw: any): number[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

export function createOrder(input: {
  title: string;
  dateYMD: string;
  timeHM: string;
  departTimeHM?: string;
  officeArriveTimeHM?: string;

  kidsCount?: number | null;
  kidsAge?: string | null;
  birthdayName?: string | null;
  address?: string | null;

  priceTotal?: number | null;
  prepayment?: number | null;

  participants: number[];
  description?: string | null;
  costume?: string | null;
}) {
  initDb();

  run(
    `INSERT INTO orders (
      title, startAtISO, departAtISO, officeArriveAtISO,
      kidsCount, kidsAge, birthdayName, address,
      priceTotal, prepayment,
      participants, description, costume, createdAtISO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      toISO(input.dateYMD, input.timeHM),
      input.departTimeHM ? toISO(input.dateYMD, input.departTimeHM) : null,
      input.officeArriveTimeHM ? toISO(input.dateYMD, input.officeArriveTimeHM) : null,
      input.kidsCount ?? null,
      input.kidsAge ?? null,
      input.birthdayName ?? null,
      input.address ?? null,
      input.priceTotal ?? null,
      input.prepayment ?? null,
      JSON.stringify(input.participants ?? []),
      input.description ?? null,
      input.costume ?? null,
      new Date().toISOString(),
    ]
  );
}

export function listOrdersByMonth(year: number, month0: number): Order[] {
  initDb();

  const start = new Date(year, month0, 1, 0, 0, 0, 0);
  const end = new Date(year, month0 + 1, 1, 0, 0, 0, 0);

  const rows = db.getAllSync<any>(
    `SELECT * FROM orders
     WHERE startAtISO >= ? AND startAtISO < ?
     ORDER BY startAtISO ASC`,
    [start.toISOString(), end.toISOString()]
  );

  return rows.map((o) => ({ ...o, participants: parseParticipants(o.participants) })) as Order[];
}

export function listOrdersByUser(userId: number): Order[] {
  initDb();
  const rows = db.getAllSync<any>("SELECT * FROM orders ORDER BY startAtISO ASC");
  const mapped = rows.map((o) => ({ ...o, participants: parseParticipants(o.participants) })) as Order[];
  return mapped.filter((o) => o.participants.includes(userId));
}

export function getOrderById(id: number): Order | null {
  initDb();
  const rows = db.getAllSync<any>(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
  const o = rows?.[0];
  if (!o) return null;
  return { ...o, participants: parseParticipants(o.participants) } as Order;
}

export function updateOrder(id: number, patch: Partial<Omit<Order, "id" | "createdAtISO">>) {
  initDb();

  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const normalized = entries.map(([k, v]) => {
    if (k === "participants") return [k, JSON.stringify(v ?? [])];
    return [k, v];
  });

  const setSql = normalized.map(([k]) => `${k} = ?`).join(", ");
  const values = normalized.map(([, v]) => v);

  run(`UPDATE orders SET ${setSql} WHERE id = ?`, [...values, id]);
}

export function deleteOrder(id: number) {
  initDb();
  run("DELETE FROM orders WHERE id = ?", [id]);
}
