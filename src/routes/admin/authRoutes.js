const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  registerInitialAdmin,
} = require('../../controllers/admin/authController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.post('/login', loginAdmin);
router.post('/register-initial', registerInitialAdmin);
router.get('/profile', protect, adminOnly, getAdminProfile);
router.put('/profile', protect, adminOnly, updateAdminProfile);

module.exports = router;
