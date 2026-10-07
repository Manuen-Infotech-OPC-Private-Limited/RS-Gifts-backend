import Inquiry from '../../models/Inquiry.js';

// @desc    Submit a customer inquiry / message
// @route   POST /api/customer/inquiries
// @access  Public
export const createInquiry = async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name.',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your message.',
      });
    }

    const inquiry = await Inquiry.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject: subject ? subject.trim() : 'General Inquiry',
      message: message.trim(),
      status: 'Unread',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting RS Gifts! Your inquiry has been received. Our team will get back to you shortly.',
      inquiry,
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit inquiry. Please try again.',
    });
  }
};
