import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix Windows / ISP DNS SRV resolution issue for MongoDB Atlas (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.warn('Could not configure custom DNS servers:', e);
}

// Ensure .env is loaded
if (!process.env.MONGO_URI) {
  dotenv.config();
  if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
  }
  if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
  }
}

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb+srv://shaikabdul:shaikabdulr503@data-storage.uleb4ax.mongodb.net/RSGIFTS?retryWrites=true&w=majority';

  if (!uri || uri === 'your_mongodb_connection_string_here') {
    console.error('WARNING: MONGODB CONNECTION STRING MISSING OR UNCONFIGURED!');
    return false;
  }

  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch {}

    const conn = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'RSGIFTS',
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected.');
    });

    return true;
  } catch (error) {
    console.error(`MongoDB Connection Failed: ${error.message}`);
    return false;
  }
};

export default connectDB;
