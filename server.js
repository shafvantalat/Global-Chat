import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectMongo, getDb } from './server/mongoClient.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

// CORS middleware for Express endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Connect to MongoDB and start the server
let db = null;
let serverStarted = false;

// Start server immediately, try to connect to MongoDB in the background
const PORT = process.env.PORT || 3001;
console.log(`Starting server on port ${PORT}...`);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server listening on port ${PORT}`);
  serverStarted = true;
});

// Try to connect to MongoDB without blocking server startup
(async () => {
  try {
    db = await connectMongo();
    if (!db) {
      console.warn('⚠ Running in memory-only mode (no database)');
    } else {
      console.log('✓ Database is ready');
      await loadBannedPatterns();
      await loadHighlightedUsernames();
    }
  } catch (err) {
    console.error('Error initializing MongoDB:', err.message);
  }
})();

// Online users and moderation tracking
const onlineUsers = new Map();
const userStrikeState = new Map();
let bannedPatterns = [];
let highlightedUsernames = new Map(); // username -> { password_hash, highlight_color }

// In-memory storage (fallback when MongoDB is offline)
const inMemoryStore = {
  users: new Map(),
  groups: new Map(),
  groupMembers: [],
  messages: [],
  bannedUsernames: [],
  highlightedUsernames: [],
  nextId: { users: 1, groups: 1, members: 1, messages: 1, banned: 1, highlighted: 1 },
};

// Load banned patterns from MongoDB
const loadBannedPatterns = async () => {
  if (!db) {
    console.warn('Cannot load banned patterns: MongoDB not available');
    return;
  }
  try {
    const rows = await db.collection('banned_usernames').find({}, { projection: { username: 1 } }).toArray();
    bannedPatterns = rows.map((r) => (r.username || '').toLowerCase());
    console.log('✓ Loaded banned patterns:', bannedPatterns.length);
  } catch (err) {
    console.error('✗ Failed to load banned patterns from MongoDB:', err.message);
  }
};

// Load highlighted usernames from MongoDB
const loadHighlightedUsernames = async () => {
  if (!db) {
    console.warn('Cannot load highlighted usernames: MongoDB not available');
    return;
  }
  try {
    const rows = await db.collection('highlighted_usernames').find().toArray();
    highlightedUsernames = new Map();
    rows.forEach((r) => {
      highlightedUsernames.set(r.username.toLowerCase(), {
        password_hash: r.password_hash,
        highlight_color: r.highlight_color || '#ffd700',
      });
    });
    console.log('✓ Loaded highlighted usernames:', highlightedUsernames.size);
  } catch (err) {
    console.error('✗ Failed to load highlighted usernames from MongoDB:', err.message);
  }
};

// Periodic refresh of banned patterns (only if DB is available)
setInterval(async () => {
  if (db) {
    try {
      await loadBannedPatterns();
      await loadHighlightedUsernames();
    } catch (err) {
      console.error('Error refreshing patterns:', err.message);
    }
  }
}, 60 * 1000); // every minute

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
    // server-side simple moderation: detect banned words and apply temporary bans
    try {
      const userId = socket.userId;
      const now = Date.now();

      // check if user is currently temp-banned
      const state = userStrikeState.get(userId) || { strikes: 0, bannedUntil: 0 };
      if (state.bannedUntil && state.bannedUntil > now) {
        socket.emit('message:blocked', {
          reason: 'You are temporarily banned from sending messages',
          bannedUntil: state.bannedUntil,
        });
        return;
      }

      const text = (messageData.content || '').toLowerCase();
      const matched = bannedPatterns.find((p) => p && text.includes(p));

      if (matched) {
        // increment strike
        state.strikes = (state.strikes || 0) + 1;

        // set temp ban after 3 strikes (example) -> 10 minutes
        if (state.strikes >= 3) {
          state.bannedUntil = now + 10 * 60 * 1000;
          state.strikes = 0; // reset strikes after ban
          socket.emit('message:blocked', {
            reason: 'You have been temporarily muted for using prohibited language',
            bannedUntil: state.bannedUntil,
          });
        } else {
          socket.emit('message:warning', {
            reason: 'Prohibited language detected',
            strikes: state.strikes,
          });
        }

        userStrikeState.set(userId, state);
        return;
      }

      // pass through if no matches
      io.to(messageData.groupId).emit('message:new', messageData);
    } catch (err) {
      console.error('Error moderating message:', err);
      io.to(messageData.groupId).emit('message:new', messageData);
    }
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

// Express JSON middleware must come before routes
app.use(express.json());

// Admin endpoint to add banned username
app.post('/admin/ban', async (req, res) => {
  const secret = req.get('x-admin-secret');
  if (secret !== process.env.ADMIN_API_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    if (db) {
      const doc = { username: username.trim().toLowerCase(), reason: reason || null, created_at: new Date() };
      const result = await db.collection('banned_usernames').insertOne(doc);
      loadBannedPatterns();
      return res.json({ insertedId: result.insertedId });
    } else {
      // In-memory mode
      const id = String(inMemoryStore.nextId.banned++);
      const doc = { _id: id, username: username.trim().toLowerCase(), reason: reason || null, created_at: new Date() };
      inMemoryStore.bannedUsernames.push(doc);
      bannedPatterns.push(doc.username);
      return res.json({ insertedId: id });
    }
  } catch (err) {
    console.error('Admin ban failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public API: list banned usernames
app.get('/api/banned_usernames', async (req, res) => {
  try {
    if (db) {
      const rows = await db.collection('banned_usernames').find().sort({ created_at: -1 }).toArray();
      res.json(rows);
    } else {
      res.json(inMemoryStore.bannedUsernames);
    }
  } catch (err) {
    console.error('Failed to list banned_usernames:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete banned username (admin)
app.delete('/api/banned_usernames/:id', async (req, res) => {
  const secret = req.get('x-admin-secret');
  if (secret !== process.env.ADMIN_API_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    if (db) {
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('banned_usernames').deleteOne({ _id: new ObjectId(id) });
      loadBannedPatterns();
      res.json({ deletedCount: result.deletedCount });
    } else {
      // In-memory mode
      const idx = inMemoryStore.bannedUsernames.findIndex(b => b._id === id);
      if (idx > -1) {
        inMemoryStore.bannedUsernames.splice(idx, 1);
        // Rebuild bannedPatterns
        bannedPatterns = inMemoryStore.bannedUsernames.map(b => b.username);
        res.json({ deletedCount: 1 });
      } else {
        res.json({ deletedCount: 0 });
      }
    }
  } catch (err) {
    console.error('Failed to delete banned username:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HIGHLIGHTED USERNAMES (Admin only) ====================

// List highlighted usernames (public - for UI to show highlights)
app.get('/api/highlighted_usernames', async (req, res) => {
  try {
    if (db) {
      const rows = await db.collection('highlighted_usernames').find().sort({ created_at: -1 }).toArray();
      // Don't expose password hashes
      res.json(rows.map(r => ({ 
        id: r._id.toString(), 
        username: r.username, 
        highlight_color: r.highlight_color || '#ffd700',
        created_at: r.created_at 
      })));
    } else {
      res.json(inMemoryStore.highlightedUsernames.map(h => ({
        id: h._id,
        username: h.username,
        highlight_color: h.highlight_color || '#ffd700',
        created_at: h.created_at
      })));
    }
  } catch (err) {
    console.error('Failed to list highlighted_usernames:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add highlighted username (admin only)
app.post('/admin/highlight', async (req, res) => {
  const secret = req.get('x-admin-secret');
  if (secret !== process.env.ADMIN_API_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const { username, password, highlight_color } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required to reserve this username' });

  try {
    const crypto = await import('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const usernameLower = username.trim().toLowerCase();

    if (db) {
      // Check if already exists
      const existing = await db.collection('highlighted_usernames').findOne({ username: usernameLower });
      if (existing) {
        return res.status(400).json({ error: 'This username is already highlighted' });
      }

      const doc = { 
        username: usernameLower, 
        password_hash: passwordHash, 
        highlight_color: highlight_color || '#ffd700',
        created_at: new Date() 
      };
      const result = await db.collection('highlighted_usernames').insertOne(doc);
      await loadHighlightedUsernames();
      return res.json({ insertedId: result.insertedId.toString() });
    } else {
      // In-memory mode
      const existing = inMemoryStore.highlightedUsernames.find(h => h.username === usernameLower);
      if (existing) {
        return res.status(400).json({ error: 'This username is already highlighted' });
      }

      const id = String(inMemoryStore.nextId.highlighted++);
      const doc = { 
        _id: id, 
        username: usernameLower, 
        password_hash: passwordHash,
        highlight_color: highlight_color || '#ffd700',
        created_at: new Date() 
      };
      inMemoryStore.highlightedUsernames.push(doc);
      highlightedUsernames.set(usernameLower, { password_hash: passwordHash, highlight_color: highlight_color || '#ffd700' });
      return res.json({ insertedId: id });
    }
  } catch (err) {
    console.error('Admin highlight failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete highlighted username (admin only)
app.delete('/api/highlighted_usernames/:id', async (req, res) => {
  const secret = req.get('x-admin-secret');
  if (secret !== process.env.ADMIN_API_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    if (db) {
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('highlighted_usernames').deleteOne({ _id: new ObjectId(id) });
      await loadHighlightedUsernames();
      res.json({ deletedCount: result.deletedCount });
    } else {
      // In-memory mode
      const idx = inMemoryStore.highlightedUsernames.findIndex(h => h._id === id);
      if (idx > -1) {
        const removed = inMemoryStore.highlightedUsernames.splice(idx, 1)[0];
        highlightedUsernames.delete(removed.username);
        res.json({ deletedCount: 1 });
      } else {
        res.json({ deletedCount: 0 });
      }
    }
  } catch (err) {
    console.error('Failed to delete highlighted username:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Groups endpoints
app.get('/api/groups', async (req, res) => {
  try {
    if (db) {
      const rows = await db.collection('groups').find().sort({ is_global: -1, created_at: 1 }).toArray();
      // Ensure global group exists
      const hasGlobal = rows.some(g => g.is_global);
      if (!hasGlobal) {
        const globalDoc = { name: 'Global Chat', description: 'Main chat room for everyone', is_global: true, created_at: new Date() };
        const result = await db.collection('groups').insertOne(globalDoc);
        globalDoc._id = result.insertedId;
        rows.unshift(globalDoc);
      }
      res.json(rows);
    } else {
      // Fallback to in-memory storage
      const groups = Array.from(inMemoryStore.groups.values());
      // Ensure global group exists
      const hasGlobal = groups.some(g => g.is_global);
      if (!hasGlobal) {
        const id = String(inMemoryStore.nextId.groups++);
        const globalDoc = { _id: id, name: 'Global Chat', description: 'Main chat room for everyone', is_global: true, created_at: new Date() };
        inMemoryStore.groups.set(id, globalDoc);
        groups.unshift(globalDoc);
      }
      res.json(groups);
    }
  } catch (err) {
    console.error('Failed to list groups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group (admin only) - cannot delete global group
app.delete('/api/groups/:id', async (req, res) => {
  const secret = req.get('x-admin-secret');
  console.log('[DELETE GROUP] Received secret:', secret ? '***' : 'NONE', 'Expected:', process.env.ADMIN_API_SECRET ? '***' : 'NOT SET');
  if (secret !== process.env.ADMIN_API_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret. Please check your Admin Secret in Settings.' });
  }
  
  const { id } = req.params;
  try {
    if (db) {
      const { ObjectId } = await import('mongodb');
      // Check if it's a global group
      const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (group.is_global) return res.status(400).json({ error: 'Cannot delete the global group' });
      
      // Delete the group and its messages
      await db.collection('messages').deleteMany({ group_id: id });
      await db.collection('group_members').deleteMany({ group_id: id });
      const result = await db.collection('groups').deleteOne({ _id: new ObjectId(id) });
      
      io.emit('group:deleted', { groupId: id });
      res.json({ deletedCount: result.deletedCount });
    } else {
      // In-memory mode
      const group = inMemoryStore.groups.get(id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (group.is_global) return res.status(400).json({ error: 'Cannot delete the global group' });
      
      inMemoryStore.groups.delete(id);
      inMemoryStore.messages = inMemoryStore.messages.filter(m => m.group_id !== id);
      inMemoryStore.groupMembers = inMemoryStore.groupMembers.filter(m => m.group_id !== id);
      
      io.emit('group:deleted', { groupId: id });
      res.json({ deletedCount: 1 });
    }
  } catch (err) {
    console.error('Failed to delete group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/groups', async (req, res) => {
  const { name, description, created_by, is_global } = req.body;
  try {
    if (db) {
      const doc = { name, description: description || '', created_by: created_by || null, is_global: !!is_global, created_at: new Date() };
      const result = await db.collection('groups').insertOne(doc);
      const inserted = await db.collection('groups').findOne({ _id: result.insertedId });
      io.emit('group:created', inserted);
      res.json(inserted);
    } else {
      // Fallback to in-memory storage
      const id = String(inMemoryStore.nextId.groups++);
      const doc = { _id: id, name, description: description || '', created_by: created_by || null, is_global: !!is_global, created_at: new Date() };
      inMemoryStore.groups.set(id, doc);
      io.emit('group:created', doc);
      res.json(doc);
    }
  } catch (err) {
    console.error('Failed to create group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Messages endpoints
app.get('/api/messages', async (req, res) => {
  const groupId = req.query.groupId;
  try {
    if (db) {
      const q = groupId ? { group_id: String(groupId) } : {};
      const rows = await db.collection('messages').find(q).sort({ created_at: 1 }).limit(100).toArray();
      res.json(rows);
    } else {
      // Fallback to in-memory storage
      const filtered = groupId 
        ? inMemoryStore.messages.filter(m => m.group_id === String(groupId))
        : inMemoryStore.messages;
      res.json(filtered.slice(-100));
    }
  } catch (err) {
    console.error('Failed to list messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Group members
app.post('/api/group_members', async (req, res) => {
  const { group_id, user_id, is_online } = req.body;
  try {
    if (db) {
      const existing = await db.collection('group_members').findOne({ group_id, user_id });
      if (!existing) {
        const doc = { group_id, user_id, joined_at: new Date(), is_online: !!is_online };
        const result = await db.collection('group_members').insertOne(doc);
        const inserted = await db.collection('group_members').findOne({ _id: result.insertedId });
        res.json(inserted);
      } else {
        await db.collection('group_members').updateOne({ _id: existing._id }, { $set: { is_online: !!is_online } });
        const updated = await db.collection('group_members').findOne({ _id: existing._id });
        res.json(updated);
      }
    } else {
      // Fallback to in-memory storage
      const id = `${group_id}:${user_id}`;
      const existing = inMemoryStore.groupMembers.find(m => m.id === id);
      if (!existing) {
        const doc = { id, group_id, user_id, joined_at: new Date(), is_online: !!is_online };
        inMemoryStore.groupMembers.push(doc);
        res.json(doc);
      } else {
        existing.is_online = !!is_online;
        res.json(existing);
      }
    }
  } catch (err) {
    console.error('Failed to upsert group_member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple login/create user endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    // Force all usernames to lowercase
    const trimmed = String(username).trim().toLowerCase();
    const trimmedLower = trimmed;

    if (db) {
      // MongoDB mode
      // check banned
      const banned = await db.collection('banned_usernames').findOne({ username: trimmedLower });
      if (banned && trimmedLower !== 'admin') {
        return res.status(403).json({ error: 'This username is not allowed' });
      }

      // Check if username is highlighted/reserved (requires password)
      const highlighted = await db.collection('highlighted_usernames').findOne({ username: trimmedLower });
      if (highlighted) {
        if (!password) {
          return res.status(400).json({ error: 'This username is reserved. Password required.' });
        }
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (highlighted.password_hash !== hash) {
          return res.status(403).json({ error: 'Invalid password for this reserved username' });
        }
      }

      let user = await db.collection('users').findOne({ username: trimmed });
      let isHighlighted = !!highlighted;
      let highlightColor = highlighted?.highlight_color || null;
      
      if (user) {
        // admin password validation
        if (user.is_admin) {
          if (!password) return res.status(400).json({ error: 'Admin password required' });
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(password).digest('hex');
          if (user.admin_password_hash !== hash) return res.status(403).json({ error: 'Invalid admin password' });
        }
        // update last_seen and highlight status
        await db.collection('users').updateOne({ _id: user._id }, { $set: { last_seen: new Date(), is_highlighted: isHighlighted, highlight_color: highlightColor } });
      } else {
        // create user
        if (trimmedLower === 'admin' && password) {
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(password).digest('hex');
          const { insertedId } = await db.collection('users').insertOne({ username: trimmed, is_admin: true, admin_password_hash: hash, is_highlighted: isHighlighted, highlight_color: highlightColor, created_at: new Date(), last_seen: new Date() });
          user = await db.collection('users').findOne({ _id: insertedId });
        } else {
          const { insertedId } = await db.collection('users').insertOne({ username: trimmed, is_admin: false, is_highlighted: isHighlighted, highlight_color: highlightColor, created_at: new Date(), last_seen: new Date() });
          user = await db.collection('users').findOne({ _id: insertedId });
        }

        // add to global group if exists
        const globalGroup = await db.collection('groups').findOne({ is_global: true });
        if (globalGroup) {
          await db.collection('group_members').insertOne({ group_id: globalGroup._id.toString(), user_id: user._id.toString(), joined_at: new Date(), is_online: true });
        }
      }

      // return minimal user info including highlight status
      res.json({ 
        id: user._id.toString(), 
        username: user.username, 
        isAdmin: !!user.is_admin,
        isHighlighted: !!user.is_highlighted,
        highlightColor: user.highlight_color || null
      });
    } else {
      // In-memory mode
      // Check banned
      if (inMemoryStore.bannedUsernames.some(b => b.username === trimmedLower) && trimmedLower !== 'admin') {
        return res.status(403).json({ error: 'This username is not allowed' });
      }

      // Check if username is highlighted/reserved (requires password)
      const highlighted = inMemoryStore.highlightedUsernames.find(h => h.username === trimmedLower);
      if (highlighted) {
        if (!password) {
          return res.status(400).json({ error: 'This username is reserved. Password required.' });
        }
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (highlighted.password_hash !== hash) {
          return res.status(403).json({ error: 'Invalid password for this reserved username' });
        }
      }

      let user = inMemoryStore.users.get(trimmedLower);
      const isHighlighted = !!highlighted;
      const highlightColor = highlighted?.highlight_color || null;

      if (user) {
        // admin password validation
        if (user.is_admin) {
          if (!password) return res.status(400).json({ error: 'Admin password required' });
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(password).digest('hex');
          if (user.admin_password_hash !== hash) return res.status(403).json({ error: 'Invalid admin password' });
        }
        user.last_seen = new Date();
        user.is_highlighted = isHighlighted;
        user.highlight_color = highlightColor;
      } else {
        // create user
        const id = String(inMemoryStore.nextId.users++);
        user = {
          _id: id,
          username: trimmed,
          is_admin: trimmedLower === 'admin' && password,
          is_highlighted: isHighlighted,
          highlight_color: highlightColor,
        };
        if (user.is_admin && password) {
          const crypto = await import('crypto');
          user.admin_password_hash = crypto.createHash('sha256').update(password).digest('hex');
        }
        user.created_at = new Date();
        user.last_seen = new Date();
        inMemoryStore.users.set(trimmedLower, user);
      }

      res.json({ 
        id: user._id, 
        username: user.username, 
        isAdmin: !!user.is_admin,
        isHighlighted: !!user.is_highlighted,
        highlightColor: user.highlight_color || null
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// update last_seen
app.post('/api/users/:id/last_seen', async (req, res) => {
  const { id } = req.params;
  try {
    if (db) {
      const { ObjectId } = await import('mongodb');
      await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: { last_seen: new Date() } });
    } else {
      // In-memory mode - find user by ID and update
      for (const user of inMemoryStore.users.values()) {
        if (user._id === id) {
          user.last_seen = new Date();
          break;
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update last_seen:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all 404 handler for any missing routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error-handling middleware (must have 4 args)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const isProd = process.env.NODE_ENV === 'production';
  const payload = { error: isProd ? 'Internal server error' : (err && err.message) || 'Internal server error' };
  if (!isProd && err && err.stack) payload.stack = err.stack;
  try {
    res.status(err && err.status ? err.status : 500).json(payload);
  } catch (e) {
    // fallback
    res.status(500).json({ error: 'Internal server error' });
  }
});

