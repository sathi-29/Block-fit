import { Router } from 'express';
import { dataStore as store } from '../lib/dataStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await store.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return next(error);
  }
});

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await store.deleteAccount(req.user.sub);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
