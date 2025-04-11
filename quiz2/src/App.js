import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [quotes, setQuotes] = useState([]);
  const [source, setSource] = useState('design');
  const [quoteId, setQuoteId] = useState('');
  const [singleQuote, setSingleQuote] = useState(null);
  const [newQuote, setNewQuote] = useState('');
  const [error, setError] = useState('');

  const loadQuotes = async () => {
    const res = await axios.get('http://localhost:3000/quiz2');
    setQuotes(res.data);
  };

  const runETL = async () => {
    try {
      const res = await axios.post('http://localhost:3000/quiz2', { source });
      alert('Quote added: ' + res.data.quote);
      loadQuotes();
    } catch (err) {
      setError(err.message);
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

  const deleteAll = async () => {
    await axios.delete('http://localhost:3000/quiz2');
    loadQuotes();
  };

  const deleteById = async (id) => {
    await axios.delete(`http://localhost:3000/quiz2/${id}`);
    loadQuotes();
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 Quiz 2 - Quotes</h1>

      <h2>➕ Run ETL</h2>
      <select onChange={(e) => setSource(e.target.value)}>
        <option value="design">Quotes on Design</option>
        <option value="forismatic">Forismatic</option>
      </select>
      <button onClick={runETL}>Run ETL</button>

      <h2>🔍 Get Quote by ID</h2>
      <input value={quoteId} onChange={(e) => setQuoteId(e.target.value)} />
      <button onClick={getQuoteById}>Search</button>
      {singleQuote && <pre>{JSON.stringify(singleQuote, null, 2)}</pre>}

      <h2>🗑️ Danger Zone</h2>
      <button onClick={deleteAll}>Delete All Quotes</button>

      <h2>📋 All Quotes</h2>
      {quotes.map((q) => (
        <div key={q.id} style={{ border: '1px solid #ccc', marginBottom: 10, padding: 10 }}>
          <p><strong>{q.author}</strong></p>
          <p>{q.quote}</p>
          <button onClick={() => deleteById(q.id)}>Delete</button>
        </div>
      ))}

      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
    </div>
  );
}

export default App;
