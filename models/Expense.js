const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  note: { type: String, trim: true, default: '' }
}, { timestamps: true });

// Speeds up the month-filter queries the dashboard runs constantly
expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
