const mongoose = require('mongoose');

const savingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  deadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Saving', savingSchema);
