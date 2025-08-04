// controllers/categoryController.js
import Category from '../models/Category.js';

// GET: /api/categories/get
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.status(200).json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST: /api/categories/create
export const createCategory = async (req, res) => {
  try {
    const { id, name, icon, articleCount } = req.body; // ✅ include articleCount
    const newCategory = new Category({ id, name, icon, articleCount });
    await newCategory.save();
    res.status(201).json({ success: true, category: newCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// DELETE: /api/categories/delete/:id
export const deleteCategory = async (req, res) => {
  try {
    await Category.findOneAndDelete({ id: req.params.id });
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};