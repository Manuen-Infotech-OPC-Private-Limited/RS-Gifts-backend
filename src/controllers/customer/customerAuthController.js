import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import generateToken from '../../utils/generateToken.js';

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

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar || '',
        address: customer.address || (customer.addresses?.[0]?.addressLine1 || ''),
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

// @desc    Get customer profile
// @route   GET /api/customer/auth/profile
// @access  Private (Customer)
const getCustomerProfile = async (req, res) => {
  try {
    const customer = await User.findById(req.user.id);
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
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        addresses: customer.addresses,
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
    const customer = await User.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const { name, firstName, lastName, phone, dob, gender, avatar, address } = req.body;
    if (firstName !== undefined) customer.firstName = firstName.trim();
    if (lastName !== undefined) customer.lastName = lastName.trim();
    if (dob !== undefined) customer.dob = dob.trim();
    if (gender !== undefined) customer.gender = gender.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (avatar !== undefined) customer.avatar = avatar.trim();
    if (address !== undefined) customer.address = address.trim();

    if (name) {
      customer.name = name.trim();
    } else if (customer.firstName || customer.lastName) {
      customer.name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name;
    }

    await customer.save();

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
    const { recipientName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

    if (!recipientName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, phone, street address, city, state, and postal code are required',
      });
    }

    const customer = await User.findById(req.user.id);

    if (isDefault) {
      customer.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    customer.addresses.push({
      recipientName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country: country || 'India',
      isDefault: customer.addresses.length === 0 ? true : Boolean(isDefault),
    });

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

// @desc    Delete shipping address
// @route   DELETE /api/customer/auth/addresses/:addressId
// @access  Private (Customer)
const deleteCustomerAddress = async (req, res) => {
  try {
    const customer = await User.findById(req.user.id);
    customer.addresses = customer.addresses.filter(
      (a) => a._id.toString() !== req.params.addressId
    );

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

export {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  deleteCustomerAddress,
};
