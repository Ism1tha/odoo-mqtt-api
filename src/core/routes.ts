import express from 'express';

import { robotRouter } from '../modules/robot/index.js';

export const apiRouter: express.Router = express.Router();

apiRouter.get('/hello', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Hello World!' });
});

apiRouter.use('/robots', robotRouter);
