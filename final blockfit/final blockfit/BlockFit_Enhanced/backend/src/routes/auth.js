import { Router } from 'express';
import { createHash, randomBytes, randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';

import { comparePassword, hashPassword, signToken } from '../lib/auth.js';
import { env } from '../config/env.js';
import { dataStore as store, dataStoreReady } from '../lib/dataStore.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8).regex(/\d/, 'Password must contain at least one number'),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().min(1).max(255).optional(),
  password: z.string().min(8),
}).refine((body) => body.identifier || body.email, { message: 'Email or username is required' });

const passwordResetSchema = z.object({
  email: z.string().trim().email().max(255),
});

const passwordUpdateSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).regex(/\d/, 'Password must contain at least one number'),
});

const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');
const resetMailer = env.SMTP_HOST && env.SMTP_FROM
  ? nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  : null;

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    await dataStoreReady;
    const [existingEmail, existingUsername, emailIdentifierCollision] = await Promise.all([
      store.findUserByEmail(parsed.email),
      store.findUserByIdentifier(parsed.username),
      store.findUserByIdentifier(parsed.email),
    ]);
    if (existingEmail || existingUsername || emailIdentifierCollision) {
      return res.status(409).json({ error: existingEmail ? 'An account with this email already exists' : 'This username is already taken' });
    }

    const passwordHash = await hashPassword(parsed.password);
    const user = {
      id: randomUUID(),
      email: parsed.email.toLowerCase(),
      username: parsed.username.toLowerCase(),
      phone: parsed.phone || null,
      name: parsed.name,
      passwordHash,
    };

    await store.addUser(user);

    const token = signToken({ sub: user.id, email: user.email, username: user.username, name: user.name });
    return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Please check your details' });
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email or username already exists' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    await dataStoreReady;
    const user = await store.findUserByIdentifier(parsed.identifier || parsed.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const isValid = await comparePassword(parsed.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const token = signToken({ sub: user.id, email: user.email, username: user.username, name: user.name });
    return res.json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Please check your details' });
    next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = passwordResetSchema.parse(req.body);
    if (!resetMailer) {
      return res.status(503).json({ error: 'Password reset email is not configured. Contact your BlockFit administrator.' });
    }

    await dataStoreReady;
    const user = await store.findUserByEmail(email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await store.createPasswordResetToken({
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      const resetUrl = `${env.CLIENT_APP_URL.replace(/\/$/, '')}/#/reset-password/${token}`;
      await resetMailer.sendMail({
        from: env.SMTP_FROM,
        to: user.email,
        subject: 'Reset your BlockFit password',
        text: `Use this link within 30 minutes to reset your BlockFit password: ${resetUrl}`,
      });
    }
    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Enter a valid email address' });
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = passwordUpdateSchema.parse(req.body);
    await dataStoreReady;
    const userId = await store.consumePasswordResetToken(hashResetToken(parsed.token));
    if (!userId) return res.status(400).json({ error: 'This password reset link is invalid or expired. Request a new one.' });
    await store.updatePasswordHash(userId, await hashPassword(parsed.password));
    return res.json({ message: 'Password updated. You can now log in.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Please check your new password' });
    next(error);
  }
});

export default router;
