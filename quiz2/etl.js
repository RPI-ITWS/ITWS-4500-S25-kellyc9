const axios = require('axios');
const Quote = require('./models/Quote');

// Utility to strip HTML tags
function stripHTML(html) {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

// Get the next ID by counting current documents
async function getNextId() {
  const count = await Quote.countDocuments({});
  return count + 1;
}

// Fetch and transform from QuotesOnDesign
async function fetchFromQuotesOnDesign() {
  const res = await axios.get('https://quotesondesign.com/wp-json/wp/v2/posts/?orderby=rand');
  const data = res.data[0];
  return {
    author: data.title.rendered || 'Unknown',
    quote: stripHTML(data.content.rendered || '')
  };
}

// Fetch and transform from Forismatic
async function fetchFromForismatic() {
  const res = await axios.get('https://api.forismatic.com/api/1.0/', {
    params: {
      method: 'getQuote',
      format: 'json',
      lang: 'en'
    }
  });

  const data = res.data;
  return {
    author: data.quoteAuthor || 'Unknown',
    quote: data.quoteText.trim()
  };
}

// Main ETL runner function
async function runETL(source) {
  let quoteData;

  if (source === 'design') {
    quoteData = await fetchFromQuotesOnDesign();
  } else if (source === 'forismatic') {
    quoteData = await fetchFromForismatic();
  } else {
    throw new Error('Invalid source passed to ETL');
  }

  quoteData.id = await getNextId();
  const savedQuote = await Quote.create(quoteData);
  return savedQuote;
}

module.exports = { runETL };
