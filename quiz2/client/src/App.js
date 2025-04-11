
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [quotes, setQuotes] = useState([]);
  const [idInput, setIdInput] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    fetch('/quiz2')
      .then(res => res.json())
      .then(data => setQuotes(data))
      .catch(err => console.error('Failed to load quotes', err));
  }, []);

  const fetchQuoteById = () => {
    fetch(`/quiz2/${idInput}`)
      .then(res => res.json())
      .then(data => setSelectedQuote(data))
      .catch(err => setSelectedQuote({ error: 'Quote not found' }));
  };

  const runETL = () => {
    fetch('/quiz2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'design' })
    })
      .then(res => res.json())
      .then(data => {
        alert('ETL complete');
        setQuotes(prev => [...prev, data]);
      })
      .catch(err => alert('ETL failed'));
  };

  return (
    <div className="container">
      <h1>Quote Explorer</h1>

      <div>
        <input
          type="text"
          placeholder="Enter quote ID"
          value={idInput}
          onChange={e => setIdInput(e.target.value)}
        />
        <button onClick={fetchQuoteById}>Get Quote</button>
        <button onClick={runETL}>Run ETL</button>
      </div>

      {selectedQuote && (
        <div className="quote">
          <div>{selectedQuote.quote || selectedQuote.error}</div>
          {selectedQuote.author && <div className="quote-author">— {selectedQuote.author}</div>}
        </div>
      )}

      <h2>All Quotes</h2>
      {quotes.map((q, index) => (
        <div className="quote" key={index}>
          <div>{q.quote}</div>
          <div className="quote-author">— {q.author}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
