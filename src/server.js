import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';
import { getJwtSecret } from './config/jwtConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  try {
    // Validate security credentials configuration
    getJwtSecret();

    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
