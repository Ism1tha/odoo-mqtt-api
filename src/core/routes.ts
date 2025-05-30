import express from 'express';

import { robotRouter } from '../modules/robot/index.js';

export const apiRouter: express.Router = express.Router();

apiRouter.use('/robots', robotRouter);
