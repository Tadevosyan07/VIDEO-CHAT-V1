import express from 'express';
import { createServer } from 'http';
import Server from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { ExpressPeerServer } from 'peer';

const app = express();
export const server = createServer(app);
const io = new Server(server);
const peerServer = ExpressPeerServer(server, {
  debug: true
});

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/peerjs', peerServer);
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get('/:room', (req, res) => {
  res.render(path.join(__dirname, 'views', 'room.ejs'), { roomId: req.params.room });
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userName);
    });

    socket.on('screen-share', ({ streamId, roomId }) => {
      socket.to(roomId).emit('user-screen-sharing', streamId);
    });

    socket.on('pointer-control', (pointerData) => {
      socket.to(pointerData.roomId).emit('pointer-control', pointerData);
    });

    socket.on('end-call', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      socket.leave(roomId);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

const PORT = process.env.PORT || 3031;
server.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});

export default io;
