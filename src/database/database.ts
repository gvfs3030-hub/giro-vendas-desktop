// [LOCAL] — serviço de banco de dados SQLite, 100% offline
import * as SQLite from '../platform/sqliteCompat';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('giro.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      sellerName TEXT NOT NULL,
      companyName TEXT NOT NULL,
      category TEXT NOT NULL,
      phone TEXT,
      monthlyGoal REAL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      razaoSocial TEXT NOT NULL,
      nomeFantasia TEXT NOT NULL,
      cnpjCpf TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      cep TEXT,
      street TEXT,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      latitude REAL,
      longitude REAL,
      photoUri TEXT,
      observations TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      barcode TEXT,
      category TEXT,
      unit TEXT NOT NULL DEFAULT 'UN',
      price1 REAL NOT NULL DEFAULT 0,
      price2 REAL,
      price3 REAL,
      stockCurrent INTEGER DEFAULT 0,
      stockMinimum INTEGER DEFAULT 0,
      photoUri TEXT,
      description TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      orderNumber INTEGER NOT NULL,
      clientId TEXT NOT NULL,
      subtotal REAL NOT NULL,
      totalDiscount REAL DEFAULT 0,
      total REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      installmentCount INTEGER DEFAULT 1,
      observations TEXT,
      signatureUri TEXT,
      status TEXT DEFAULT 'pendente',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      saleId TEXT NOT NULL,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity REAL NOT NULL,
      unitPrice REAL NOT NULL,
      discount REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      priceTable INTEGER DEFAULT 1,
      unit TEXT NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS installments (
      id TEXT PRIMARY KEY,
      saleId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      installmentNumber INTEGER NOT NULL,
      dueDate TEXT NOT NULL,
      amount REAL NOT NULL,
      amountPaid REAL DEFAULT 0,
      status TEXT DEFAULT 'pendente',
      paymentDate TEXT,
      paymentMethod TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      checkInAt TEXT NOT NULL,
      checkOutAt TEXT,
      checkInLatitude REAL,
      checkInLongitude REAL,
      checkOutLatitude REAL,
      checkOutLongitude REAL,
      durationMinutes INTEGER,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visit_plans (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      plannedDate TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      visitId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      photoUri TEXT,
      observations TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      yearMonth TEXT NOT NULL UNIQUE,
      targetAmount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // [LOCAL] Migração leve: adiciona colunas novas em bancos já existentes (quem já tinha
  // o app instalado) sem apagar nada. ALTER TABLE falha se a coluna já existe — isso é
  // esperado e ignorado, então é seguro rodar isso toda vez que o app abre.
  const addColumnIfMissing = async (table: string, column: string, def: string) => {
    try {
      await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
    } catch (e) {
      // coluna já existe — ok
    }
  };
  await addColumnIfMissing('sales', 'interestRate', 'REAL DEFAULT 0');
  await addColumnIfMissing('sales', 'cardInstallments', 'INTEGER DEFAULT 1');
  await addColumnIfMissing('sales', 'signatureData', 'TEXT');

  // Create indexes
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_clients_nomeFantasia ON clients(nomeFantasia);
    CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
    CREATE INDEX IF NOT EXISTS idx_clients_isActive ON clients(isActive);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_sales_clientId ON sales(clientId);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
    CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);
    CREATE INDEX IF NOT EXISTS idx_sale_items_saleId ON sale_items(saleId);
    CREATE INDEX IF NOT EXISTS idx_sale_items_productId ON sale_items(productId);
    CREATE INDEX IF NOT EXISTS idx_installments_saleId ON installments(saleId);
    CREATE INDEX IF NOT EXISTS idx_installments_clientId ON installments(clientId);
    CREATE INDEX IF NOT EXISTS idx_installments_dueDate ON installments(dueDate);
    CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
    CREATE INDEX IF NOT EXISTS idx_visits_clientId ON visits(clientId);
    CREATE INDEX IF NOT EXISTS idx_visits_checkInAt ON visits(checkInAt);
    CREATE INDEX IF NOT EXISTS idx_visit_plans_date ON visit_plans(plannedDate);
    CREATE INDEX IF NOT EXISTS idx_visit_plans_clientId ON visit_plans(clientId);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_goals_yearMonth ON goals(yearMonth);
  `);

  // Update overdue installments
  const today = new Date().toISOString().split('T')[0];
  await database.runAsync(
    `UPDATE installments SET status = 'vencida', updatedAt = ? WHERE status = 'pendente' AND dueDate < ?`,
    [new Date().toISOString(), today ?? '']
  );
}
