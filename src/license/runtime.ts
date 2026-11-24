/**
 * Licence state of the installed (desktop) application: machine code, 7-day trial, activation.
 * The trial start is kept in two places (a file in the data folder and the database) and the
 * earliest one wins, so deleting one of them does not restart the trial.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { computeLicenseState, LicensePayload, LicenseState, machineCodeFrom, verifyLicense } from './license.ts';
import { LICENSE_PUBLIC_KEY_PEM } from './publicKey.ts';
import { getAppSettings, setAppSettings } from '../db/repository.ts';

export const isDesktop = () => process.env.PM_DESKTOP === '1';

/** Stable identifier of the PC: Windows MachineGuid, Linux machine-id, otherwise host + CPU. */
function rawMachineId(): string {
  try {
    if (process.platform === 'win32') {
      const out = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8', windowsHide: true });
      const m = /MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/.exec(out);
      if (m) return m[1];
    }
    for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
    }
  } catch {
    /* fall back below */
  }
  return `${os.hostname()}|${os.cpus()[0]?.model || ''}|${os.totalmem()}`;
}

let cachedMachineCode: string | null = null;
export function machineCode(): string {
  if (!cachedMachineCode) cachedMachineCode = machineCodeFrom(rawMachineId());
  return cachedMachineCode;
}

interface LicenseFile {
  trialStart: number;
  lastSeen: number;
  key?: string;
}

const licenseFile = () => path.join(process.env.PM_DATA_DIR || path.join(os.homedir(), '.parking-manager'), 'license.json');

function readFile(): Partial<LicenseFile> {
  try {
    return JSON.parse(fs.readFileSync(licenseFile(), 'utf8'));
  } catch {
    return {};
  }
}

function writeFile(data: LicenseFile) {
  fs.mkdirSync(path.dirname(licenseFile()), { recursive: true });
  fs.writeFileSync(licenseFile(), JSON.stringify(data));
}

export interface LicenseStatus {
  /** web = hosted version, no licence needed */
  mode: 'web' | 'desktop';
  machineCode?: string;
  state?: LicenseState;
}

/** Reads (and keeps up to date) the stored dates and key, then computes the state. */
export async function licenseStatus(now = Date.now()): Promise<LicenseStatus> {
  if (!isDesktop()) return { mode: 'web' };
  const file = readFile();
  const db = await getAppSettings(['license.trialStart', 'license.lastSeen', 'license.key']).catch(() => ({} as Record<string, string>));
  const starts = [file.trialStart, Number(db['license.trialStart']) || undefined].filter((n): n is number => !!n && n > 0);
  const trialStart = starts.length ? Math.min(...starts) : now;
  const lastSeen = Math.max(file.lastSeen || 0, Number(db['license.lastSeen']) || 0, 0) || now;
  const key = file.key || db['license.key'];

  let license: LicensePayload | null = null;
  if (key) {
    const check = verifyLicense(key, machineCode(), LICENSE_PUBLIC_KEY_PEM);
    if (check.ok) license = check.payload;
  }
  const state = computeLicenseState({ now, trialStart, lastSeen, license });

  // Remember the first launch and the latest date seen (both places)
  const seen = state.state === 'expired' && state.reason === 'clock' ? lastSeen : Math.max(lastSeen, now);
  writeFile({ trialStart, lastSeen: seen, ...(key ? { key } : {}) });
  await setAppSettings({ 'license.trialStart': String(trialStart), 'license.lastSeen': String(seen) }).catch(() => undefined);
  return { mode: 'desktop', machineCode: machineCode(), state };
}

/** Saves an activation key after checking it is genuine and made for this PC. */
export async function activateLicense(key: string): Promise<{ ok: true; status: LicenseStatus } | { ok: false; error: string }> {
  const clean = key.trim().replace(/\s+/g, '');
  const check = verifyLicense(clean, machineCode(), LICENSE_PUBLIC_KEY_PEM);
  if (!check.ok) return check;
  const file = readFile();
  writeFile({ trialStart: file.trialStart || Date.now(), lastSeen: Math.max(file.lastSeen || 0, Date.now()), key: clean });
  await setAppSettings({ 'license.key': clean }).catch(() => undefined);
  allowCache = null;
  return { ok: true, status: await licenseStatus() };
}

let allowCache: { at: number; allowed: boolean } | null = null;

/** True when the application may be used (web version, active licence or trial running). Re-checked every minute. */
export async function licenseAllowsUse(): Promise<boolean> {
  if (!isDesktop()) return true;
  if (allowCache && Date.now() - allowCache.at < 60_000) return allowCache.allowed;
  const s = await licenseStatus();
  allowCache = { at: Date.now(), allowed: s.state?.state !== 'expired' };
  return allowCache.allowed;
}
