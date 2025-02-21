const express = require('express');
const app = express();
const path = require('path');
const https = require('https');
const port = 3000;
const cors = require('cors');

app.use(express.json());
app.use(cors());

// Serving static files (like HTML, CSS, JS)
app.use(express.static('public'));

// Endpoint to get latest exchange rates
app.get('/api/rates', async (req, res) => {
  try {
      const response = await fetch('https://api.frankfurter.app/latest');
      const data = await response.json();
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Endpoint to convert currency
app.get('/api/convert', async (req, res) => {
  const { amount, from, to } = req.query;

  if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
      const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});