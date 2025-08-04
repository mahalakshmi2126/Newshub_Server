// routes/categoryRoutes.js
import express from 'express';
import {
  getAllCategories,
  createCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/get', getAllCategories);
router.post('/create', createCategory);
router.delete('/delete/:id', deleteCategory);

export default router;
