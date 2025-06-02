import express from 'express';

import { taskRouter } from '../modules/task/index.js';

/**
 * Main API router for the application.
 * Mounts all module routers under their respective paths.
 */
export const apiRouter: express.Router = express.Router();

// Mount the task router under /tasks
apiRouter.use('/tasks', taskRouter);
