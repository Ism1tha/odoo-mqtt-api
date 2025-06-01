import express from 'express';

import { taskRouter } from '../modules/task/index.js';

export const apiRouter: express.Router = express.Router();

apiRouter.use('/tasks', taskRouter);
