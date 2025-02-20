import express from 'express';

var server = null;
const app = express();

export const startExpress = () => {
    server = app.listen(process.env.BIND_PORT, () => {
        console.log(`Express server listening on port ${process.env.BIND_PORT}`);
    });
}

export const stopExpress = () => {
    if (!server) return;
    server.close();
    console.log('Express server stopped');
}
