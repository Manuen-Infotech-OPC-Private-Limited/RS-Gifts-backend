import Inquiry from '../../models/Inquiry.js';

// @desc    Get all inquiries with optional filter & search
// @route   GET /api/admin/inquiries
// @access  Private (Admin)
export const getInquiries = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customer inquiries.',
    });
  }
};

// @desc    Update inquiry status or add admin notes
// @route   PATCH /api/admin/inquiries/:id/status
// @access  Private (Admin)
export const updateInquiryStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['Unread', 'Read', 'Replied', 'Archived'];

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      inquiry.status = status;
    }

    if (adminNotes !== undefined) {
      inquiry.adminNotes = adminNotes;
    }

    const updated = await inquiry.save();

    res.status(200).json({
      success: true,
      message: `Inquiry status updated to "${inquiry.status}"`,
      inquiry: updated,
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update inquiry status.',
    });
  }
};

// @desc    Delete an inquiry
// @route   DELETE /api/admin/inquiries/:id
// @access  Private (Admin)
export const deleteInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete inquiry.',
    });
  }
};
