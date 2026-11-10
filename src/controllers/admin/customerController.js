import User from '../../models/User.js';
import Order from '../../models/Order.js';

// @desc    Get all customers with aggregated spending, profile fields and order counts
// @route   GET /api/admin/customers
// @access  Private (Admin)
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: { $ne: 'admin' } };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await User.find(filter).sort({ createdAt: -1 });

    // Aggregate orders and profile data for each customer
    const enhancedCustomers = await Promise.all(
      customers.map(async (c) => {
        const customerOrders = await Order.find({
          $or: [{ customer: c._id }, { 'customerInfo.email': c.email.toLowerCase() }],
        });

        const totalOrders = customerOrders.length;
        const totalSpent = customerOrders.reduce((sum, ord) => {
          if (ord.orderStatus !== 'Cancelled') {
            return sum + (ord.totalAmount || 0);
          }
          return sum;
        }, 0);

        const latestOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const fullName = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';

        // Real customer addresses from registered profile
        const combinedAddresses = [...(c.addresses || [])];
        if (combinedAddresses.length === 0 && c.address && c.address !== '—' && c.address !== 'Not provided') {
          combinedAddresses.push({
            _id: c._id,
            recipientName: fullName,
            phone: c.phone || '',
            addressLine1: c.address,
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
            isDefault: true,
          });
        }

        // Determine formatted primary location/address
        let primaryAddress = 'Not provided';
        if (c.address && c.address !== '—' && c.address !== 'Not provided') {
          primaryAddress = c.address;
        } else if (combinedAddresses.length > 0) {
          const def = combinedAddresses.find((a) => a.isDefault) || combinedAddresses[0];
          primaryAddress = [def.addressLine1, def.addressLine2, def.city, def.state, def.postalCode].filter(Boolean).join(', ');
        }

        return {
          id: c._id.toString(),
          _id: c._id.toString(),
          name: fullName,
          firstName: c.firstName || (fullName.split(' ')[0] || ''),
          lastName: c.lastName || (fullName.split(' ').slice(1).join(' ') || ''),
          email: c.email,
          phone: c.phone || 'N/A',
          dob: c.dob || '',
          gender: c.gender || '',
          address: primaryAddress,
          addresses: combinedAddresses,
          addressesCount: combinedAddresses.length,
          isActive: c.isActive !== false,
          totalOrders,
          totalSpent,
          lastOrderDate: latestOrder ? new Date(latestOrder.createdAt).toLocaleDateString() : 'No orders',
          joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
          createdAt: c.createdAt,
          lastLogin: c.lastLogin,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enhancedCustomers.length,
      customers: enhancedCustomers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single customer profile and order history
// @route   GET /api/admin/customers/:id
// @access  Private (Admin)
const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const orders = await Order.find({
      $or: [{ customer: customer._id }, { 'customerInfo.email': customer.email.toLowerCase() }],
    }).sort({ createdAt: -1 });

    const totalSpent = orders.reduce((sum, ord) => {
      if (ord.orderStatus !== 'Cancelled') {
        return sum + (ord.totalAmount || 0);
      }
      return sum;
    }, 0);

    const fullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';

    // Real customer addresses from registered profile
    const combinedAddresses = [...(customer.addresses || [])];
    if (combinedAddresses.length === 0 && customer.address && customer.address !== '—' && customer.address !== 'Not provided') {
      combinedAddresses.push({
        _id: customer._id,
        recipientName: fullName,
        phone: customer.phone || '',
        addressLine1: customer.address,
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        isDefault: true,
      });
    }

    let primaryAddress = 'Not provided';
    if (customer.address && customer.address !== '—' && customer.address !== 'Not provided') {
      primaryAddress = customer.address;
    } else if (combinedAddresses.length > 0) {
      const def = combinedAddresses.find((a) => a.isDefault) || combinedAddresses[0];
      primaryAddress = [def.addressLine1, def.addressLine2, def.city, def.state, def.postalCode].filter(Boolean).join(', ');
    }

    res.status(200).json({
      success: true,
      customer: {
        id: customer._id.toString(),
        _id: customer._id.toString(),
        name: fullName,
        firstName: customer.firstName || (fullName.split(' ')[0] || ''),
        lastName: customer.lastName || (fullName.split(' ').slice(1).join(' ') || ''),
        email: customer.email,
        phone: customer.phone || 'N/A',
        dob: customer.dob || '',
        gender: customer.gender || '',
        address: primaryAddress,
        addresses: combinedAddresses,
        addressesCount: combinedAddresses.length,
        isActive: customer.isActive !== false,
        createdAt: customer.createdAt,
        lastLogin: customer.lastLogin,
        totalOrders: orders.length,
        totalSpent,
      },
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle customer active/blocked status
// @route   PATCH /api/admin/customers/:id/toggle-status
// @access  Private (Admin)
const toggleCustomerStatus = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer account is now ${customer.isActive ? 'Active' : 'Blocked'}`,
      customer: {
        id: customer._id.toString(),
        _id: customer._id.toString(),
        name: customer.name,
        isActive: customer.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getCustomers,
  getCustomerById,
  toggleCustomerStatus,
};
