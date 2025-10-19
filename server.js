import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', ({ userId, username, groupId }) => {
    socket.userId = userId;
    socket.username = username;
    socket.join(groupId);

    if (!onlineUsers.has(groupId)) {
      onlineUsers.set(groupId, new Map());
    }
    onlineUsers.get(groupId).set(userId, { username, socketId: socket.id });

    const users = Array.from(onlineUsers.get(groupId).values()).map(u => ({
      id: u.socketId,
      username: u.username,
    }));

    io.to(groupId).emit('users:update', {
      groupId,
      users,
    });

    socket.to(groupId).emit('user:joined', {
      groupId,
      username,
    });
  });

  socket.on('group:join', ({ groupId }) => {
    socket.join(groupId);

    if (!onlineUsers.has(groupId)) {
      onlineUsers.set(groupId, new Map());
    }

    if (socket.userId) {
      onlineUsers.get(groupId).set(socket.userId, {
        username: socket.username,
        socketId: socket.id,
      });

      io.to(groupId).emit('users:update', {
        groupId,
        users: Array.from(onlineUsers.get(groupId).values()).map(u => ({
          id: u.socketId,
          username: u.username,
        })),
      });
    }
  });

  socket.on('group:leave', ({ groupId }) => {
    socket.leave(groupId);

    if (onlineUsers.has(groupId) && socket.userId) {
      onlineUsers.get(groupId).delete(socket.userId);

      io.to(groupId).emit('users:update', {
        groupId,
        users: Array.from(onlineUsers.get(groupId).values()).map(u => ({
          id: u.socketId,
          username: u.username,
        })),
      });
    }
  });

  socket.on('message:send', (messageData) => {
    io.to(messageData.groupId).emit('message:new', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    onlineUsers.forEach((groupUsers, groupId) => {
      if (socket.userId && groupUsers.has(socket.userId)) {
        groupUsers.delete(socket.userId);

        io.to(groupId).emit('users:update', {
          groupId,
          users: Array.from(groupUsers.values()).map(u => ({
            id: u.socketId,
            username: u.username,
          })),
        });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
