const express = require('express');
const router = express.Router();
const {
  getOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
} = require('../../controllers/admin/occasionController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getOccasions)
  .post(createOccasion);

router.route('/:id')
  .put(updateOccasion)
  .delete(deleteOccasion);

module.exports = router;
