import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === 'your_mongodb_connection_string_here') {
    console.error('WARNING: MONGODB CONNECTION STRING MISSING OR UNCONFIGURED!');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'RSGIFTS',
      serverSelectionTimeoutMS: 5000,
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
