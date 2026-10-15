import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeEnv = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

const fallbackOrigins = nodeEnv === 'production' ? [] : developmentOrigins;
const configuredOrigins = (process.env.CLIENT_ORIGIN || fallbackOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: nodeEnv,
  JWT_SECRET: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'development-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  INTEGRITY_HMAC_SECRET: process.env.INTEGRITY_HMAC_SECRET || process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'development-integrity-secret-change-me'),
  CLIENT_ORIGIN: configuredOrigins.join(','),
  DATABASE_URL: process.env.DATABASE_URL || '',
  CLIENT_APP_URL: process.env.CLIENT_APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
  CLINICIAN_ADMIN_SECRET: process.env.CLINICIAN_ADMIN_SECRET || '',
};

if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production. Configure a private signing secret.');
  }
  if (!env.INTEGRITY_HMAC_SECRET) {
    throw new Error('INTEGRITY_HMAC_SECRET is required in production. Configure a private integrity secret.');
  }
}

export const allowedOrigins = new Set([
  ...configuredOrigins,
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
]);
