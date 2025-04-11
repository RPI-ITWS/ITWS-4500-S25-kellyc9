const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  id: Number,
  author: String,
  quote: String
});

module.exports = mongoose.model('Quote', quoteSchema);