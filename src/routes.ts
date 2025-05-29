import express from 'express';

import syncRobots from './controllers/robot.controller.js';

const router = express.Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

router.post('/robots/sync', syncRobots);

export default router;
