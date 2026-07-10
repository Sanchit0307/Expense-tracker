const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');

// GET /api/budgets?month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const filter = month ? { month } : {};
    const budgets = await Budget.find(filter).sort({ category: 1 });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budgets  (creates or updates the budget for a category+month)
router.post('/', async (req, res) => {
  try {
    const { category, amount, month } = req.body;
    if (!category || amount == null || !month) {
      return res.status(400).json({ error: 'category, amount, and month are required' });
    }
    const budget = await Budget.findOneAndUpdate(
      { category, month },
      { amount },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Budget.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
