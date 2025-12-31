import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn('MONGO_URI not set. MongoDB client will not be initialized.');
}

let client = null;
let db = null;
let connectionPromise = null;

export async function connectMongo() {
  if (!MONGO_URI) {
    console.warn('Cannot connect to MongoDB: MONGO_URI not set');
    return null;
  }
  
  // Avoid multiple simultaneous connection attempts
  if (connectionPromise) return connectionPromise;
  
  connectionPromise = (async () => {
    if (client && db) {
      console.log('Reusing existing MongoDB connection');
      return db;
    }

    try {
      console.log('Attempting to connect to MongoDB...');
      client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 5000,
        retryWrites: true,
      });
      
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 4000))
      ]);
      
      db = client.db('global_chat'); // Explicitly specify DB name
      
      // Test the connection
      const adminDb = client.db('admin');
      await adminDb.command({ ping: 1 });
      
      console.log('✓ Connected to MongoDB successfully');
      return db;
    } catch (err) {
      console.error('✗ Failed to connect to MongoDB:', err.message || err);
      console.error('💡 Tip: Check MongoDB Atlas IP whitelist or network connectivity');
      client = null;
      db = null;
      connectionPromise = null;
      return null;
    }
  })();

  return connectionPromise;
}

export function getDb() {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo first.');
  return db;
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
