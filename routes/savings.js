const express = require('express');
const router = express.Router();
const Saving = require('../models/Saving');

// GET /api/savings
router.get('/', async (req, res) => {
  try {
    const savings = await Saving.find().sort({ createdAt: -1 });
    res.json(savings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/savings
router.post('/', async (req, res) => {
  try {
    const { title, targetAmount, deadline } = req.body;
    if (!title || !targetAmount) {
      return res.status(400).json({ error: 'title and targetAmount are required' });
    }
    const saving = await Saving.create({ title, targetAmount, deadline });
    res.status(201).json(saving);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/savings/:id  (add money toward a goal, or edit details)
router.put('/:id', async (req, res) => {
  try {
    const { addAmount, title, targetAmount, deadline } = req.body;
    const saving = await Saving.findById(req.params.id);
    if (!saving) return res.status(404).json({ error: 'Savings goal not found' });

    if (addAmount) saving.currentAmount += Number(addAmount);
    if (title) saving.title = title;
    if (targetAmount) saving.targetAmount = targetAmount;
    if (deadline) saving.deadline = deadline;

    await saving.save();
    res.json(saving);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/savings/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Saving.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Savings goal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
