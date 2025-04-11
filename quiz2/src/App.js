import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [quotes, setQuotes] = useState([]);
  const [source, setSource] = useState('design');
  const [quoteId, setQuoteId] = useState('');
  const [singleQuote, setSingleQuote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllQuotes();
  }, []);

  const fetchAllQuotes = async () => {
    try {
      const res = await axios.get('http://localhost:3000/quiz2');
      setQuotes(res.data);
    } catch (err) {
      setError('Failed to load quotes');
    }
  };

  const runETL = async () => {
    try {
      await axios.post('http://localhost:3000/quiz2', { source });
      fetchAllQuotes();
    } catch (err) {
      setError('ETL failed');
    }
  };

  const getQuoteById = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/quiz2/${quoteId}`);
      setSingleQuote(res.data);
    } catch (err) {
      setError('Quote not found');
      setSingleQuote(null);
    }
  };

  const deleteAllQuotes = async () => {
    try {
      await axios.delete('http://localhost:3000/quiz2');
      fetchAllQuotes();
    } catch (err) {
      setError('Failed to delete all quotes');
    }
  };

  const deleteQuoteById = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/quiz2/${id}`);
      fetchAllQuotes();
    } catch (err) {
      setError(`Failed to delete quote ${id}`);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Quiz 2 - Quotes</h1>

      <div>
        <h3>Run ETL</h3>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="design">Quotes on Design</option>
          <option value="forismatic">Forismatic</option>
        </select>
        <button onClick={runETL}>Fetch quote</button>
      </div>

      <div>
        <h3>Find Quote by ID</h3>
        <input value={quoteId} onChange={(e) => setQuoteId(e.target.value)} />
        <button onClick={getQuoteById}>Get</button>
        {singleQuote && (
          <pre>{JSON.stringify(singleQuote, null, 2)}</pre>
        )}
      </div>

      <div>
        <h3>All Quotes</h3>
        <button onClick={deleteAllQuotes}>Delete All</button>
        {quotes.map((q) => (
          <div key={q.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
            <p><strong>{q.author}</strong></p>
            <p>{q.quote}</p>
            <button onClick={() => deleteQuoteById(q.id)}>Delete</button>
          </div>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;
