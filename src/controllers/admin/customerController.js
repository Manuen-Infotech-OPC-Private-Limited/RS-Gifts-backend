const User = require('../../models/User');
const Order = require('../../models/Order');

// @desc    Get all customers with aggregated spending and order counts
// @route   GET /api/admin/customers
// @access  Private (Admin)
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: 'customer' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await User.find(filter).sort({ createdAt: -1 });

    // Aggregate orders for each customer
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

        return {
          id: c._id,
          name: c.name,
          email: c.email,
          phone: c.phone || 'N/A',
          isActive: c.isActive,
          totalOrders,
          totalSpent,
          lastOrderDate: latestOrder ? latestOrder.createdAt : null,
          joinedAt: c.createdAt,
          addressesCount: (c.addresses || []).length,
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

    res.status(200).json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isActive: customer.isActive,
        addresses: customer.addresses,
        createdAt: customer.createdAt,
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
        id: customer._id,
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

module.exports = {
  getCustomers,
  getCustomerById,
  toggleCustomerStatus,
};
