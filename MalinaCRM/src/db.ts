import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("malina_crm.db");

/* =========================
   SAFE SYNC RUNNER
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
export type UserRole = "admin" | "manager" | "accountant" | "user";

export type UserPermissions = {
  canAssignParticipants: boolean;
  canEditRanks: boolean;
  canCreateOrders: boolean;
  canManageFinance: boolean;
  canTopUpCoins: boolean;
};

export type UserProfile = {
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  rank: string | null; // звание
  coins: number; // MalinaCoins

  // shop
  avatarKey: string | null;
  ownedAvatars: string; // JSON string
};

export type User = {
  id: number;
  login: string;
  password: string;
  role: UserRole;

  // profile
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  rank: string | null;
  coins: number;

  // shop
  avatarKey: string | null;
  ownedAvatars: string | null; // TEXT(JSON)

  // permissions
  canAssignParticipants: 0 | 1;
  canEditRanks: 0 | 1;
  canCreateOrders: 0 | 1;
  canManageFinance: 0 | 1;
  canTopUpCoins: 0 | 1;
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
   INIT DB + MIGRATIONS
========================= */
function tryAlter(sql: string) {
  try {
    db.execSync(sql);
  } catch {}
}

function defaultPermsByRole(role: UserRole): UserPermissions {
  if (role === "admin") {
    return {
      canAssignParticipants: true,
      canEditRanks: true,
      canCreateOrders: true,
      canManageFinance: true,
      canTopUpCoins: true,
    };
  }
  if (role === "manager") {
    return {
      canAssignParticipants: true,
      canEditRanks: true,
      canCreateOrders: true,
      canManageFinance: false,
      canTopUpCoins: false,
    };
  }
  if (role === "accountant") {
    return {
      canAssignParticipants: false,
      canEditRanks: false,
      canCreateOrders: false,
      canManageFinance: true,
      canTopUpCoins: true,
    };
  }
  return {
    canAssignParticipants: false,
    canEditRanks: false,
    canCreateOrders: false,
    canManageFinance: false,
    canTopUpCoins: false,
  };
}

function parseOwnedAvatars(raw: any): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function initDb() {
  // USERS base
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );
  `);

  // Migrations: profile fields
  tryAlter(`ALTER TABLE users ADD COLUMN firstName TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN lastName TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN age INTEGER;`);
  tryAlter(`ALTER TABLE users ADD COLUMN phone TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN email TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN telegram TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN rank TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN coins REAL NOT NULL DEFAULT 0;`);

  // Migrations: shop fields
  tryAlter(`ALTER TABLE users ADD COLUMN avatarKey TEXT;`);
  tryAlter(`ALTER TABLE users ADD COLUMN ownedAvatars TEXT NOT NULL DEFAULT '[]';`);

  // Migrations: permissions flags (0/1)
  tryAlter(`ALTER TABLE users ADD COLUMN canAssignParticipants INTEGER NOT NULL DEFAULT 0;`);
  tryAlter(`ALTER TABLE users ADD COLUMN canEditRanks INTEGER NOT NULL DEFAULT 0;`);
  tryAlter(`ALTER TABLE users ADD COLUMN canCreateOrders INTEGER NOT NULL DEFAULT 0;`);
  tryAlter(`ALTER TABLE users ADD COLUMN canManageFinance INTEGER NOT NULL DEFAULT 0;`);
  tryAlter(`ALTER TABLE users ADD COLUMN canTopUpCoins INTEGER NOT NULL DEFAULT 0;`);

  // Seed users
  db.execSync(`
    INSERT OR IGNORE INTO users (login, password, role) VALUES
    ('Malina', '0000', 'admin'),
    ('Malina1', '0000', 'user'),
    ('Malina2', '0000', 'user');
  `);

  // Malina точно админ
  run(
    `UPDATE users SET role = 'admin'
     WHERE login = 'Malina'`,
    []
  );

  // Проставляем дефолтные права тем, у кого они все 0
  const users = db.getAllSync<User>(`SELECT * FROM users`);
  for (const u of users) {
    const allZero =
      (u.canAssignParticipants ?? 0) === 0 &&
      (u.canEditRanks ?? 0) === 0 &&
      (u.canCreateOrders ?? 0) === 0 &&
      (u.canManageFinance ?? 0) === 0 &&
      (u.canTopUpCoins ?? 0) === 0;

    if (allZero) {
      const p = defaultPermsByRole((u.role as UserRole) || "user");
      run(
        `UPDATE users
         SET canAssignParticipants = ?, canEditRanks = ?, canCreateOrders = ?, canManageFinance = ?, canTopUpCoins = ?
         WHERE id = ?`,
        [
          p.canAssignParticipants ? 1 : 0,
          p.canEditRanks ? 1 : 0,
          p.canCreateOrders ? 1 : 0,
          p.canManageFinance ? 1 : 0,
          p.canTopUpCoins ? 1 : 0,
          u.id,
        ]
      );
    }

    // ✅ Магазин: у каждого должен быть default в ownedAvatars и активный avatarKey
    const owned = parseOwnedAvatars(u.ownedAvatars);
    let changed = false;

    if (!owned.includes("default")) {
      owned.push("default");
      changed = true;
    }

    const nextAvatarKey = u.avatarKey || "default";
    if (u.avatarKey !== nextAvatarKey) changed = true;

    if (changed) {
      run(
        `UPDATE users SET ownedAvatars = ?, avatarKey = ? WHERE id = ?`,
        [JSON.stringify(owned), nextAvatarKey, u.id]
      );
    }
  }

  // ORDERS
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
   HELPERS
========================= */
export function can(user: User | null | undefined, perm: keyof UserPermissions) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const map: Record<keyof UserPermissions, keyof User> = {
    canAssignParticipants: "canAssignParticipants",
    canEditRanks: "canEditRanks",
    canCreateOrders: "canCreateOrders",
    canManageFinance: "canManageFinance",
    canTopUpCoins: "canTopUpCoins",
  };
  const key = map[perm];
  return (user[key] as any) === 1;
}

function parseParticipants(raw: any): number[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

/* =========================
   USERS
========================= */
export function getUsers(): User[] {
  initDb();
  return db.getAllSync<User>("SELECT * FROM users ORDER BY id");
}

export function getUserById(id: number): User | null {
  initDb();
  const rows = db.getAllSync<User>(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
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

export function updateUserRole(userId: number, role: UserRole) {
  initDb();
  const p = defaultPermsByRole(role);
  run(
    `UPDATE users
     SET role = ?,
         canAssignParticipants = ?,
         canEditRanks = ?,
         canCreateOrders = ?,
         canManageFinance = ?,
         canTopUpCoins = ?
     WHERE id = ?`,
    [
      role,
      p.canAssignParticipants ? 1 : 0,
      p.canEditRanks ? 1 : 0,
      p.canCreateOrders ? 1 : 0,
      p.canManageFinance ? 1 : 0,
      p.canTopUpCoins ? 1 : 0,
      userId,
    ]
  );
}

export function updateUserPermissions(userId: number, perms: Partial<UserPermissions>) {
  initDb();
  const entries = Object.entries(perms).filter(([, v]) => v !== undefined);
  if (!entries.length) return;

  const setSql = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => (v ? 1 : 0));

  run(`UPDATE users SET ${setSql} WHERE id = ?`, [...values, userId]);
}

export function updateUserProfile(userId: number, profile: Partial<UserProfile>) {
  initDb();
  const entries = Object.entries(profile).filter(([, v]) => v !== undefined);
  if (!entries.length) return;

  const setSql = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);

  run(`UPDATE users SET ${setSql} WHERE id = ?`, [...values, userId]);
}

export function addUserCoins(userId: number, delta: number) {
  initDb();
  run(`UPDATE users SET coins = COALESCE(coins,0) + ? WHERE id = ?`, [delta, userId]);
}

/* =========================
   AVATAR SHOP
========================= */
export function getOwnedAvatars(userId: number): string[] {
  const u = getUserById(userId);
  if (!u) return [];
  return parseOwnedAvatars(u.ownedAvatars);
}

export function setActiveAvatar(userId: number, avatarKey: string) {
  initDb();
  run(`UPDATE users SET avatarKey = ? WHERE id = ?`, [avatarKey, userId]);
}

export function buyAvatarIfPossible(
  userId: number,
  avatarKey: string,
  price: number
): { ok: boolean; reason?: "not_found" | "already_owned" | "not_enough" } {
  initDb();
  const u = getUserById(userId);
  if (!u) return { ok: false, reason: "not_found" };

  const owned = parseOwnedAvatars(u.ownedAvatars);

  // уже куплен — просто активируем
  if (owned.includes(avatarKey)) {
    setActiveAvatar(userId, avatarKey);
    return { ok: true, reason: "already_owned" };
  }

  // price=0: добавляем в owned без списания
  if (price <= 0) {
    const nextOwned = [...owned, avatarKey];
    run(
      `UPDATE users SET ownedAvatars = ?, avatarKey = ? WHERE id = ?`,
      [JSON.stringify(nextOwned), avatarKey, userId]
    );
    return { ok: true };
  }

  const coins = Number(u.coins ?? 0);
  if (coins < price) return { ok: false, reason: "not_enough" };

  const nextOwned = [...owned, avatarKey];
  run(
    `UPDATE users
     SET coins = COALESCE(coins,0) - ?,
         ownedAvatars = ?,
         avatarKey = ?
     WHERE id = ?`,
    [price, JSON.stringify(nextOwned), avatarKey, userId]
  );

  return { ok: true };
}

/* =========================
   ORDERS
========================= */
function toISO(dateYMD: string, timeHM: string) {
  const [y, m, d] = dateYMD.split("-").map(Number);
  const [hh, mm] = timeHM.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
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
  if (!entries.length) return;

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
