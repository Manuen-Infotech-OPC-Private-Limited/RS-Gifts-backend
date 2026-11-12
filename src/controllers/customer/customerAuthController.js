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

// @desc    Register a new customer account
// @route   POST /api/customer/auth/register
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, phone, avatar, address } = req.body;

    const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: cleanEmail });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // Hash password directly in controller
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const cleanAddress = address ? address.trim() : '';
    const initialAddresses = [];
    if (cleanAddress) {
      initialAddresses.push({
        recipientName: fullName,
        phone: phone ? phone.trim() : '',
        addressLine1: cleanAddress,
        addressLine2: '',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India',
        isDefault: true,
      });
    }

    const customer = await User.create({
      name: fullName,
      firstName: firstName ? firstName.trim() : (fullName.split(' ')[0] || ''),
      lastName: lastName ? lastName.trim() : (fullName.split(' ').slice(1).join(' ') || ''),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      avatar: avatar ? avatar.trim() : '',
      address: cleanAddress,
      addresses: initialAddresses,
      role: 'customer',
      isActive: true,
      lastLogin: new Date(),
    });

    const token = generateToken(customer._id, 'customer');

    // Register active session in MongoDB
    await createSession({
      userId: customer._id,
      role: 'customer',
      token,
      req,
      expiresInDays: 7,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! Welcome to RS Gifts.',
      token,
      user: {
        id: customer._id,
        name: customer.name,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar,
        address: customer.address || cleanAddress,
        role: customer.role,
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login customer
// @route   POST /api/customer/auth/login
// @access  Public
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const customer = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (customer.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts cannot log in through the customer storefront. Please log in directly at http://localhost:3000/login',
      });
    }

    if (!customer.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Compare password hash directly in controller
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    customer.lastLogin = new Date();
    await customer.save({ validateBeforeSave: false });

    const token = generateToken(customer._id, customer.role);

    // Register active session in MongoDB
    await createSession({
      userId: customer._id,
      role: customer.role,
      token,
      req,
      expiresInDays: 7,
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: customer._id,
        _id: customer._id,
        name: customer.name,
        firstName: customer.firstName || (customer.name?.split(' ')[0] || ''),
        lastName: customer.lastName || (customer.name?.split(' ').slice(1).join(' ') || ''),
        email: customer.email,
        phone: customer.phone || '',
        dob: customer.dob || '',
        gender: customer.gender || '',
        avatar: customer.avatar || '',
        address: customer.address || (customer.addresses?.[0]?.addressLine1 || ''),
        role: customer.role,
        addresses: customer.addresses || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get customer profile
// @route   GET /api/customer/auth/profile
// @access  Private (Customer)
const getCustomerProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: customer._id,
        _id: customer._id,
        name: customer.name,
        firstName: customer.firstName || (customer.name?.split(' ')[0] || ''),
        lastName: customer.lastName || (customer.name?.split(' ').slice(1).join(' ') || ''),
        email: customer.email,
        phone: customer.phone || '',
        dob: customer.dob || '',
        gender: customer.gender || '',
        avatar: customer.avatar || '',
        address: customer.address || (customer.addresses?.[0]?.addressLine1 || ''),
        role: customer.role,
        addresses: customer.addresses || [],
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update customer profile
// @route   PUT /api/customer/auth/profile
// @access  Private (Customer)
const updateCustomerProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const { name, firstName, lastName, phone, dob, gender, avatar, address } = req.body;
    const safeTrim = (v) => (v !== null && v !== undefined ? String(v).trim() : '');

    if (firstName !== undefined) customer.firstName = safeTrim(firstName);
    if (lastName !== undefined) customer.lastName = safeTrim(lastName);
    if (dob !== undefined) customer.dob = safeTrim(dob);
    if (gender !== undefined) customer.gender = safeTrim(gender);
    if (phone !== undefined) customer.phone = safeTrim(phone);
    if (avatar !== undefined) customer.avatar = safeTrim(avatar);
    if (address !== undefined) customer.address = safeTrim(address);

    if (name) {
      customer.name = safeTrim(name);
    } else if (customer.firstName || customer.lastName) {
      customer.name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name;
    }

    await customer.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: customer._id,
        name: customer.name,
        firstName: customer.firstName || (customer.name?.split(' ')[0] || ''),
        lastName: customer.lastName || (customer.name?.split(' ').slice(1).join(' ') || ''),
        email: customer.email,
        phone: customer.phone,
        dob: customer.dob || '',
        gender: customer.gender || '',
        avatar: customer.avatar || '',
        address: customer.address || '',
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add shipping address
// @route   POST /api/customer/auth/addresses
// @access  Private (Customer)
const addCustomerAddress = async (req, res) => {
  try {
    const {
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      tag,
      addressType,
      isDefault,
    } = req.body;

    if (!recipientName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, phone, street address, city, state, and postal code are required',
      });
    }

    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!Array.isArray(customer.addresses)) {
      customer.addresses = [];
    }

    const shouldBeDefault = customer.addresses.length === 0 ? true : Boolean(isDefault);

    if (shouldBeDefault) {
      customer.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const resolvedTag = tag || addressType || 'Home';

    customer.addresses.push({
      recipientName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country: country || 'India',
      tag: resolvedTag,
      isDefault: shouldBeDefault,
    });

    const fullAddr = [addressLine1, addressLine2, city, state, postalCode].filter(Boolean).join(', ');
    if (!customer.address || customer.address === '—' || customer.address === 'Not provided' || shouldBeDefault) {
      customer.address = fullAddr;
    }

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      addresses: customer.addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update shipping address
// @route   PUT /api/customer/auth/addresses/:addressId
// @access  Private (Customer)
const updateCustomerAddress = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { addressId } = req.params;
    const addr = customer.addresses.id(addressId) || customer.addresses.find((a) => a._id?.toString() === addressId);

    if (!addr) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const {
      recipientName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      tag,
      addressType,
      isDefault,
    } = req.body;

    if (recipientName !== undefined) addr.recipientName = recipientName;
    if (phone !== undefined) addr.phone = phone;
    if (addressLine1 !== undefined) addr.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) addr.addressLine2 = addressLine2;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (postalCode !== undefined) addr.postalCode = postalCode;
    if (country !== undefined) addr.country = country;
    if (tag !== undefined || addressType !== undefined) {
      addr.tag = tag || addressType || addr.tag || 'Home';
    }

    if (isDefault !== undefined && isDefault) {
      customer.addresses.forEach((a) => {
        a.isDefault = a._id.toString() === addr._id.toString();
      });
      const fullAddr = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
      customer.address = fullAddr;
    } else if (isDefault !== undefined && !isDefault) {
      addr.isDefault = false;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      addresses: customer.addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Set default shipping address
// @route   PUT /api/customer/auth/addresses/:addressId/default
// @access  Private (Customer)
const setDefaultCustomerAddress = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { addressId } = req.params;
    const targetAddr = customer.addresses.id(addressId) || customer.addresses.find((a) => a._id?.toString() === addressId);

    if (!targetAddr) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    customer.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === targetAddr._id.toString();
    });

    const fullAddr = [targetAddr.addressLine1, targetAddr.addressLine2, targetAddr.city, targetAddr.state, targetAddr.postalCode].filter(Boolean).join(', ');
    customer.address = fullAddr;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      addresses: customer.addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete shipping address
// @route   DELETE /api/customer/auth/addresses/:addressId
// @access  Private (Customer)
const deleteCustomerAddress = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user;
    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.addresses = customer.addresses.filter(
      (a) => a._id.toString() !== req.params.addressId
    );

    // If default address was deleted and there are remaining addresses, set the first one as default
    const hasDefault = customer.addresses.some((a) => a.isDefault);
    if (!hasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
      const def = customer.addresses[0];
      customer.address = [def.addressLine1, def.addressLine2, def.city, def.state, def.postalCode].filter(Boolean).join(', ');
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: customer.addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout customer (Invalidate active server session)
// @route   POST /api/customer/auth/logout
// @access  Private (Customer)
const logoutCustomer = async (req, res) => {
  try {
    const token = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    if (token) {
      await invalidateSession(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully from this device',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Logout customer from all active devices
// @route   POST /api/customer/auth/logout-all
// @access  Private (Customer)
const logoutAllCustomerSessions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    await invalidateAllUserSessions(userId);

    res.status(200).json({
      success: true,
      message: 'Successfully logged out from all active sessions and devices',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all active database sessions for customer account
// @route   GET /api/customer/auth/sessions
// @access  Private (Customer)
const getCustomerSessions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentToken = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    const sessions = await getUserSessions(userId, currentToken);

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

// @desc    Revoke specific device session
// @route   DELETE /api/customer/auth/sessions/:sessionId
// @access  Private (Customer)
const revokeCustomerSession = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const success = await revokeSessionById(userId, req.params.sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already revoked',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Device session revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
  logoutCustomer,
  logoutAllCustomerSessions,
  getCustomerSessions,
  revokeCustomerSession,
};
