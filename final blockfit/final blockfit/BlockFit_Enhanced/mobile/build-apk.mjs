import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(mobileRoot);
const androidRoot = path.join(mobileRoot, 'android');
const configPath = path.join(mobileRoot, 'api-config.json');

let apiBase = process.env.VITE_API_BASE;
if (!apiBase && fs.existsSync(configPath)) {
  apiBase = JSON.parse(fs.readFileSync(configPath, 'utf8')).apiBase;
}

if (!apiBase) {
  throw new Error('Set VITE_API_BASE or create mobile/api-config.json from mobile/api-config.example.json.');
}

let apiUrl;
try {
  apiUrl = new URL(apiBase);
} catch {
  throw new Error('VITE_API_BASE must be an absolute HTTPS URL ending in /api.');
}

if (apiUrl.protocol !== 'https:' || !apiUrl.pathname.replace(/\/+$/, '').endsWith('/api') || /your-|example/i.test(apiUrl.hostname)) {
  throw new Error('VITE_API_BASE must be the deployed public HTTPS API URL, for example https://your-service.onrender.com/api.');
}

process.env.VITE_API_BASE = apiUrl.toString().replace(/\/+$/, '');

function run(command, args, cwd, shell = false) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit', shell });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const isWindows = process.platform === 'win32';
run(isWindows ? 'npm.cmd' : 'npm', ['run', 'build', '--prefix', 'web'], projectRoot, isWindows);
run(isWindows ? 'npm.cmd' : 'npm', ['run', 'sync'], mobileRoot, isWindows);

if (isWindows) {
  run('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat assembleDebug'], androidRoot);
} else {
  run('./gradlew', ['assembleDebug'], androidRoot);
}

console.log(`APK created at ${path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`);