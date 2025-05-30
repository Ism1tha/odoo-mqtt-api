import express from 'express';

import { robotRouter } from '../modules/robot/index.js';

export const apiRouter = express.Router();

apiRouter.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

apiRouter.use('/robots', robotRouter);
