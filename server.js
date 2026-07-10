require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lazy MongoDB connection middleware: connects when an API route is invoked
async function ensureDb(req, res, next) {
  if (!process.env.MONGODB_URI) return next();
  if (mongoose.connection.readyState === 1) return next();
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    return next();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    // For API requests, return a 503; let static asset requests pass through
    if (req.path.startsWith('/api/')) return res.status(503).json({ error: 'Database unavailable' });
    return next();
  }
}

// Apply DB middleware only to API routes to avoid cold-start when serving static files
app.use('/api', ensureDb);
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/analyze', require('./routes/analyze'));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
