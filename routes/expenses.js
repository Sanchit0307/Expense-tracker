const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// GET /api/expenses?month=YYYY-MM  (month is optional)
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    let filter = {};

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      filter.date = { $gte: start, $lt: end };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { amount, category, date, note } = req.body;
    if (!amount || !category || !date) {
      return res.status(400).json({ error: 'amount, category, and date are required' });
    }
    const expense = await Expense.create({ amount, category, date, note });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
