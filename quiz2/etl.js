
const axios = require('axios');
const Quote = require('./models/Quote');

let nextId = 1;

const runETL = async (source = 'design') => {
  let quoteData;

  if (source === 'design') {
    // Quotes on Design
    const response = await axios.get('https://quotesondesign.com/wp-json/wp/v2/posts/?orderby=rand');
    const quote = response.data[0];
    quoteData = {
      id: nextId++,
      quote: quote.content.rendered.replace(/<[^>]+>/g, '').trim(),
      author: quote.title.rendered
    };
  } else if (source === 'forismatic') {
    // Forismatic
    const response = await axios.get('http://api.forismatic.com/api/1.0/', {
      params: {
        method: 'getQuote',
        format: 'json',
        lang: 'en'
      }
    });
    const quote = response.data;
    quoteData = {
      id: nextId++,
      quote: quote.quoteText.trim(),
      author: quote.quoteAuthor || 'Unknown'
    };
  } else {
    throw new Error('Unsupported quote source');
  }

  const saved = await Quote.create(quoteData);
  return saved;
};

module.exports = { runETL };
