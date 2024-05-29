import express from 'express';
import { createServer } from 'http';
import Server from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ExpressPeerServer } from 'peer';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Create and use the PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userName);
    });

    socket.on('screen-share', (data) => {
      socket.to(roomId).emit('user-screen-share', data);
    });

    socket.on('pointer-control', (data) => {
      socket.to(roomId).emit('pointer-control', data);
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
