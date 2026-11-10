import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import generateToken from '../../utils/generateToken.js';
import {
  createSession,
  invalidateSession,
  invalidateAllUserSessions,
  getUserSessions,
  revokeSessionById,
} from '../../services/sessionService.js';

// @desc    Authenticate Admin & Get Token
// @route   POST /api/admin/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Explicitly select password field
    const admin = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Account is not registered as an administrator.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account has been deactivated.',
      });
    }

    // Compare password directly in controller
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = generateToken(admin._id, admin.role);

    // Register active admin session in MongoDB
    await createSession({
      userId: admin._id,
      role: admin.role,
      token,
      req,
      expiresInDays: 7,
    });

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        phone: admin.phone,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during admin login',
    });
  }
};

// @desc    Get Current Admin Profile
// @route   GET /api/admin/auth/profile
// @access  Private (Admin)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    res.status(200).json({
      success: true,
      user: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update Admin Profile
// @route   PUT /api/admin/auth/profile
// @access  Private (Admin)
const updateAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    const { name, phone, avatar, currentPassword, newPassword } = req.body;

    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (avatar !== undefined) admin.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password',
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password does not match',
        });
      }
      // Hash new password in controller
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);

      // Invalidate other sessions on other devices when password changes
      const currentToken = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
      await invalidateAllUserSessions(admin._id, currentToken);
    }

    const updatedAdmin = await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        avatar: updatedAdmin.avatar,
        phone: updatedAdmin.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Register initial admin (if no admins exist)
// @route   POST /api/admin/auth/register-initial
// @access  Public (Only allowed if no admin exists in database)
const registerInitialAdmin = async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'An administrator account already exists. Use the login screen or seed script.',
      });
    }

    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    // Hash password directly in controller
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      role: 'admin',
      isActive: true,
    });

    const token = generateToken(newAdmin._id, newAdmin.role);

    // Register initial admin session in MongoDB
    await createSession({
      userId: newAdmin._id,
      role: newAdmin.role,
      token,
      req,
      expiresInDays: 7,
    });

    res.status(201).json({
      success: true,
      message: 'Initial administrator account created successfully',
      token,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout admin (Invalidate active server session)
// @route   POST /api/admin/auth/logout
// @access  Private (Admin)
const logoutAdmin = async (req, res) => {
  try {
    const token = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    if (token) {
      await invalidateSession(token);
    }

    res.status(200).json({
      success: true,
      message: 'Admin logged out successfully from this device',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout admin from all active sessions
// @route   POST /api/admin/auth/logout-all
// @access  Private (Admin)
const logoutAllAdminSessions = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    await invalidateAllUserSessions(adminId);

    res.status(200).json({
      success: true,
      message: 'Successfully logged out from all admin sessions and devices',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all active database sessions for current admin
// @route   GET /api/admin/auth/sessions
// @access  Private (Admin)
const getAdminSessions = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const currentToken = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    const sessions = await getUserSessions(adminId, currentToken);

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Revoke specific admin session by ID
// @route   DELETE /api/admin/auth/sessions/:sessionId
// @access  Private (Admin)
const revokeAdminSession = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;
    const success = await revokeSessionById(adminId, req.params.sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Admin session not found or already revoked',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin session revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  registerInitialAdmin,
  logoutAdmin,
  logoutAllAdminSessions,
  getAdminSessions,
  revokeAdminSession,
};
