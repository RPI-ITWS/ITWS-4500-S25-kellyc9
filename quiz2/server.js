const express = require('express');
const mongoose = require('mongoose');
const { runETL } = require('./etl');
const Quote = require('./models/Quote');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quiz2')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// GET all quotes
app.get('/quiz2', async (req, res) => {
  try {
    const quotes = await Quote.find({}, { _id: 0, __v: 0 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET quote by ID
app.get('/quiz2/:number', async (req, res) => {
  try {
    const quote = await Quote.findOne({ id: parseInt(req.params.number) });
    if (quote) {
      res.json(quote);
    } else {
      res.status(404).json({ error: 'Quote not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving quote' });
  }
});

// POST - run ETL
app.post('/quiz2', async (req, res) => {
  const source = req.body.source || 'design';
  try {
    const newQuote = await runETL(source);
    res.status(201).json(newQuote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST with ID - not allowed
app.post('/quiz2/:number', (req, res) => {
  res.status(400).json({ error: 'POST to /quiz2/:number is not allowed' });
});

// PUT all quotes
app.put('/quiz2', async (req, res) => {
  try {
    const result = await Quote.updateMany({}, { $set: { quote: "Updated at " + new Date().toLocaleString() } });
    res.json({ message: 'All quotes updated', result });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// PUT by ID
app.put('/quiz2/:number', async (req, res) => {
  try {
    const updated = await Quote.findOneAndUpdate(
      { id: parseInt(req.params.number) },
      req.body,
      { new: true }
    );
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Quote not found for update' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error updating quote' });
  }
});

// DELETE all
app.delete('/quiz2', async (req, res) => {
  try {
    await Quote.deleteMany({});
    res.json({ message: 'All quotes deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting all quotes' });
  }
});

// DELETE by ID
app.delete('/quiz2/:number', async (req, res) => {
  try {
    const result = await Quote.deleteOne({ id: parseInt(req.params.number) });
    if (result.deletedCount > 0) {
      res.json({ message: 'Quote deleted' });
    } else {
      res.status(404).json({ error: 'Quote not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error deleting quote' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});