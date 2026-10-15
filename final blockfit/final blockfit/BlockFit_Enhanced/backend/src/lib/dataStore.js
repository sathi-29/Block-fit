import { env } from '../config/env.js';
import { createPostgresStore, store as memoryStore } from './store.js';

export const dataStore = env.DATABASE_URL ? createPostgresStore(env.DATABASE_URL) : memoryStore;

if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production. Configure a hosted PostgreSQL database.');
}

export const dataStoreReady = dataStore.initialize ? dataStore.initialize() : Promise.resolve();

dataStoreReady.catch((error) => {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
});