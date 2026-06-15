
import http from "http";
import { app } from './app.js';
import connectDB from './db/index.js';
import { initializeSocket } from './socket/index.js';

const PORT = process.env.PORT || 8000;

connectDB();

const server = http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



