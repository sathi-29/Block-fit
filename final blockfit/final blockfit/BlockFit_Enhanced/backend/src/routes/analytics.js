import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const eventSchema = z.object({
  event: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(120),
  occurredAt: z.string().datetime().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

router.post('/', (req, res, next) => {
  try {
    const event = eventSchema.parse(req.body);
    console.info('[ANALYTICS]', JSON.stringify(event));
    return res.status(202).json({ accepted: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
