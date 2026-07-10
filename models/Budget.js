const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  month: { type: String, required: true } // format: "YYYY-MM"
}, { timestamps: true });

// One budget per category per month
budgetSchema.index({ category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
