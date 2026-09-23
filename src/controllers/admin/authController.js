const User = require('../../models/User');
const generateToken = require('../../utils/generateToken');

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

    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
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

    const isMatch = await admin.comparePassword(password);
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
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password does not match',
        });
      }
      admin.password = newPassword;
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
    const existingAdmin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
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

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'superadmin',
      isActive: true,
    });

    const token = generateToken(newAdmin._id, newAdmin.role);

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

module.exports = {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  registerInitialAdmin,
};
