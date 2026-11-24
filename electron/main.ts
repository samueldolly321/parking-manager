/**
 * Desktop version (Windows .exe): starts the built-in PostgreSQL database, then the application
 * server on this computer only, then opens the window. Data live in the user's folder
 * (%APPDATA%\Parking Manager), so they are kept when the application is updated.
 */
import { app, BrowserWindow, dialog, Menu, shell } from 'electron';
import EmbeddedPostgres from 'embedded-postgres';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)); // …/build
const appRoot = path.resolve(here, '..'); // contains dist/, database/, build/

if (!app.requestSingleInstanceLock()) app.quit();

let pg: EmbeddedPostgres | null = null;
let win: BrowserWindow | null = null;

/** A free TCP port on this computer (preferring `preferred`). */
function freePort(preferred: number): Promise<number> {
  const tryPort = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const srv = net.createServer();
      srv.unref();
      srv.once('error', reject);
      srv.listen(port, '127.0.0.1', () => {
        const p = (srv.address() as net.AddressInfo).port;
        srv.close(() => resolve(p));
      });
    });
  return tryPort(preferred).catch(() => tryPort(0));
}

/** Secrets of this installation (database password, session key), created on first launch. */
function installSecrets(dataDir: string): { dbPassword: string; sessionSecret: string } {
  const file = path.join(dataDir, 'install.json');
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (s.dbPassword && s.sessionSecret) return s;
  } catch {
    /* first launch */
  }
  const s = { dbPassword: crypto.randomBytes(18).toString('base64url'), sessionSecret: crypto.randomBytes(48).toString('base64url') };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s), { mode: 0o600 });
  return s;
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${url}/api/v1/health`);
      if (r.ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Le serveur de l’application ne répond pas.');
}

async function start() {
  const dataDir = app.getPath('userData');
  const pgDir = path.join(dataDir, 'pgdata');
  const logFile = path.join(dataDir, 'application.log');
  const log = (m: string) => fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${m}\n`);
  fs.mkdirSync(dataDir, { recursive: true });
  const { dbPassword, sessionSecret } = installSecrets(dataDir);

  // 1. Built-in database
  const pgPort = await freePort(54329);
  pg = new EmbeddedPostgres({
    databaseDir: pgDir,
    user: 'parking',
    password: dbPassword,
    port: pgPort,
    persistent: true,
    onLog: (m) => log(`[postgres] ${String(m).trim()}`),
    onError: (e) => log(`[postgres] ${String(e)}`)
  });
  const firstRun = !fs.existsSync(path.join(pgDir, 'PG_VERSION'));
  if (firstRun) await pg.initialise();
  await pg.start();
  if (firstRun) await pg.createDatabase('parking_manager');

  // 2. Application server (same code as the web version), on this computer only
  const port = await freePort(37850);
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PM_DESKTOP: '1',
    PM_APP_ROOT: appRoot,
    PM_DATA_DIR: dataDir,
    PM_HOST: '127.0.0.1',
    PORT: String(port),
    SESSION_SECRET: sessionSecret,
    DATABASE_URL: `postgres://parking:${encodeURIComponent(dbPassword)}@127.0.0.1:${pgPort}/parking_manager`
  });
  await import(pathToFileURL(path.join(here, 'server.mjs')).href);
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  log(`Application prête sur ${url}`);

  // 3. Window
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Parking Manager',
    icon: path.join(appRoot, 'build-resources', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win?.show());
  // Links to other sites open in the usual browser
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (!target.startsWith(url)) void shell.openExternal(target);
    return { action: target.startsWith(url) ? 'allow' : 'deny' };
  });
  // The camera is needed to scan the cards
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'media'));
  await win.loadURL(url);
}

async function stopDatabase() {
  if (!pg) return;
  const current = pg;
  pg = null;
  try {
    await current.stop();
  } catch {
    /* already stopped */
  }
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() =>
  start().catch(async (err) => {
    dialog.showErrorBox('Parking Manager', `Démarrage impossible :\n${err instanceof Error ? err.message : String(err)}\n\nJournal : ${path.join(app.getPath('userData'), 'application.log')}`);
    await stopDatabase();
    app.quit();
  })
);

app.on('window-all-closed', async () => {
  await stopDatabase();
  app.quit();
});

app.on('before-quit', () => {
  void stopDatabase();
});
