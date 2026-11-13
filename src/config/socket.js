import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO with HTTP Server
 * @param {import('http').Server} server 
 */
export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CLIENT_ADMIN_URL,
    process.env.CLIENT_STOREFRONT_URL,
    'https://manuen-infotech-opc-private-limited.github.io',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5000',
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.endsWith('.github.io');
        if (isAllowed || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`WebSocket CORS blocked: Origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join Admin room for dashboard live broadcasts
    socket.on('join_admin', () => {
      socket.join('admin_room');
      console.log(`[WebSocket] Socket ${socket.id} joined admin_room`);
      socket.emit('joined_admin', { success: true, timestamp: new Date() });
    });

    // Leave Admin room
    socket.on('leave_admin', () => {
      socket.leave('admin_room');
      console.log(`[WebSocket] Socket ${socket.id} left admin_room`);
    });

    // Join Order room for customer order status tracking
    socket.on('join_order', (orderId) => {
      if (orderId) {
        const roomName = `order_${String(orderId)}`;
        socket.join(roomName);
        console.log(`[WebSocket] Socket ${socket.id} joined ${roomName}`);
        socket.emit('joined_order', { orderId, success: true });
      }
    });

    socket.on('leave_order', (orderId) => {
      if (orderId) {
        socket.leave(`order_${String(orderId)}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('[WebSocket] Socket.IO server initialized successfully');
  return io;
};

/**
 * Get active Socket.IO server instance
 */
export const getIO = () => {
  return io;
};

/**
 * Emit event to all connected admin clients
 * @param {string} event 
 * @param {any} data 
 */
export const emitToAdmins = (event, data) => {
  if (io) {
    // Emit to specific admin room
    io.to('admin_room').emit(event, data);
    // Also broadcast to ensure all active admin sessions receive it even if room join is pending
    io.emit(event, data);
  }
};

/**
 * Emit event to clients tracking a specific order
 * @param {string|number} orderId 
 * @param {string} event 
 * @param {any} data 
 */
export const emitToOrder = (orderId, event, data) => {
  if (io && orderId) {
    // Emit to room for modal tracking
    io.to(`order_${String(orderId)}`).emit(event, data);
    // Also broadcast so customer's active account/orders list updates instantly
    io.emit(event, data);
  }
};

/**
 * Broadcast event to all connected clients
 * @param {string} event 
 * @param {any} data 
 */
export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

