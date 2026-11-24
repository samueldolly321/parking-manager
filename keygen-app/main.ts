/**
 * "Parking Manager — Licences": the vendor's key generator, as a Windows window (no command prompt).
 * The private key is NOT inside the program: it is imported once (license-keys/private.pem)
 * into the vendor's Windows profile, next to the history of the keys issued.
 */
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeMachineCode, signLicense, verifyLicense } from '../src/license/license';
import { LICENSE_PUBLIC_KEY_PEM } from '../src/license/publicKey';

const here = path.dirname(fileURLToPath(import.meta.url));

if (!app.requestSingleInstanceLock()) app.quit();

const dataDir = () => app.getPath('userData');
const keyFile = () => path.join(dataDir(), 'private.pem');
const historyFile = () => path.join(dataDir(), 'historique.json');

interface IssuedKey {
  date: string;
  customer: string;
  machine: string;
  key: string;
  note?: string;
}

const readHistory = (): IssuedKey[] => {
  try {
    return JSON.parse(fs.readFileSync(historyFile(), 'utf8'));
  } catch {
    return [];
  }
};

/** Does this private key match the public key built into the application? */
function matchesApp(privatePem: string): boolean {
  try {
    const pub = crypto.createPublicKey(crypto.createPrivateKey(privatePem)).export({ type: 'spki', format: 'pem' }).toString().trim();
    return pub === LICENSE_PUBLIC_KEY_PEM.trim();
  } catch {
    return false;
  }
}

function state() {
  const hasKey = fs.existsSync(keyFile());
  const pem = hasKey ? fs.readFileSync(keyFile(), 'utf8') : '';
  return { hasKey, keyMatches: hasKey && matchesApp(pem), keyPath: keyFile(), history: readHistory() };
}

ipcMain.handle('state', () => state());

ipcMain.handle('import-key', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Choisir la clé privée (private.pem)',
    filters: [{ name: 'Clé privée', extensions: ['pem'] }],
    properties: ['openFile']
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, error: '' };
  const pem = fs.readFileSync(res.filePaths[0], 'utf8');
  try {
    crypto.createPrivateKey(pem);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas une clé privée valide.' };
  }
  if (!matchesApp(pem)) {
    return { ok: false, error: 'Cette clé privée ne correspond pas à l’application Parking Manager : les clés produites seraient refusées.' };
  }
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(keyFile(), pem, { mode: 0o600 });
  return { ok: true, state: state() };
});

ipcMain.handle('generate', (_e, input: { machine: string; customer: string; note?: string }) => {
  if (!fs.existsSync(keyFile())) return { ok: false, error: 'Importez d’abord votre clé privée.' };
  const machine = normalizeMachineCode(input.machine || '');
  const customer = (input.customer || '').trim();
  if (!/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(machine)) {
    return { ok: false, error: 'Code machine invalide : 16 caractères attendus (ex. FW2X-4D2D-ETRQ-1H0C).' };
  }
  if (!customer) return { ok: false, error: 'Indiquez le nom du client.' };
  const pem = fs.readFileSync(keyFile(), 'utf8');
  const key = signLicense({ m: machine, c: customer, d: new Date().toISOString().slice(0, 10) }, pem);
  const check = verifyLicense(key, machine, LICENSE_PUBLIC_KEY_PEM);
  if (!check.ok) return { ok: false, error: `Clé refusée par l’application : ${check.error}` };
  const entry: IssuedKey = { date: new Date().toLocaleString('fr-FR'), customer, machine, key, note: (input.note || '').trim() || undefined };
  fs.writeFileSync(historyFile(), JSON.stringify([entry, ...readHistory()], null, 2));
  return { ok: true, entry, history: readHistory() };
});

ipcMain.handle('copy', (_e, text: string) => {
  clipboard.writeText(String(text || ''));
  return true;
});

ipcMain.handle('save-key', async (_e, entry: IssuedKey) => {
  const safe = entry.customer.replace(/[^\w-]+/g, '_').slice(0, 40) || 'client';
  const res = await dialog.showSaveDialog({
    title: 'Enregistrer la clé pour le client',
    defaultPath: `Cle-activation-${safe}.txt`,
    filters: [{ name: 'Texte', extensions: ['txt'] }]
  });
  if (res.canceled || !res.filePath) return false;
  fs.writeFileSync(
    res.filePath,
    `Parking Manager — clé d'activation\r\n\r\nClient : ${entry.customer}\r\nCode machine : ${entry.machine}\r\nDate : ${entry.date}\r\n\r\n` +
      `Ouvrez Parking Manager, cliquez sur « Activer » et collez la clé ci-dessous :\r\n\r\n${entry.key}\r\n`
  );
  return true;
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: 'Parking Manager — Licences',
    icon: path.join(here, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  void win.loadFile(path.join(here, 'index.html'));
  // Self-check during development: PM_KEYGEN_SELFTEST=file.json writes what the page shows, then quits
  const selftest = process.env.PM_KEYGEN_SELFTEST;
  if (selftest) {
    win.webContents.once('did-finish-load', () =>
      setTimeout(async () => {
        const seen = await win.webContents.executeJavaScript(
          "JSON.stringify({ bridge: typeof keygen, status: document.getElementById('status').textContent, setupShown: document.getElementById('setup').style.display !== 'none', appShown: document.getElementById('app').style.display !== 'none' })"
        );
        if (process.env.PM_KEYGEN_SELFTEST_MACHINE) {
          const gen = await win.webContents.executeJavaScript(
            `Promise.all([keygen.generate({ machine: ${JSON.stringify(process.env.PM_KEYGEN_SELFTEST_MACHINE)}, customer: 'Client test' }), keygen.generate({ machine: 'ABC', customer: 'X' })]).then(([a, b]) => JSON.stringify({ ok: a.ok, key: a.ok ? a.entry.key : a.error, history: a.ok ? a.history.length : 0, invalid: b.error }))`
          );
          fs.writeFileSync(selftest + '.gen.json', gen);
        }
        fs.writeFileSync(selftest, seen);
        app.quit();
      }, 1000)
    );
  }
});

app.on('window-all-closed', () => app.quit());
