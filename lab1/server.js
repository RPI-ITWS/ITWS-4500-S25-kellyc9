const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const port = 3000;

app.use(express.json());

// Serving static files (like HTML, CSS, JS)
app.use(express.static('public'));


// The JSON data will be stored in the data.json file
const dataPath = path.join(__dirname, 'data.json');

// Helper function to read JSON data
const readData = () => {
  const rawData = fs.readFileSync(dataPath);
  return JSON.parse(rawData);
};

// Helper function to write to the JSON data
const writeData = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// Get a frontend HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get a list of all songs
app.get('//songs', (req, res) => {
  const songs = readData();
  res.json(songs.map(song => ({ id: song.id, title: song.title })));
});

// Get a specific song by ID
app.get('//songs/:id', (req, res) => {
  const songId = parseInt(req.params.id, 10);
  const songs = readData();
  const song = songs.find(song => song.id === songId);
  
  if (song) {
    res.json(song);
  } else {
    res.status(404).send('Song not found');
  }
});

// Add a new song
app.post('/songs', (req, res) => {
  const newSong = req.body;
  const songs = readData();

  // Ensure unique IDs
  newSong.id = songs.length ? Math.max(...songs.map(song => song.id)) + 1 : 1;
  
  songs.push(newSong);
  writeData(songs);
  res.status(201).json(newSong);
});

// Update a specific song by ID
app.put('/songs/:id', (req, res) => {
  const songId = parseInt(req.params.id, 10);
  const songs = readData();
  const songIndex = songs.findIndex(song => song.id === songId);

  if (songIndex !== -1) {
    const updatedSong = { ...songs[songIndex], ...req.body };
    songs[songIndex] = updatedSong;
    writeData(songs);
    res.json(updatedSong);
  } else {
    res.status(404).send('Song not found');
  }
});

// Bulk update songs
app.put('/songs', (req, res) => {
  const songs = req.body;
  writeData(songs);
  res.status(200).json(songs);
});

// Delete a song by ID
app.delete('/songs/:id', (req, res) => {
  const songId = parseInt(req.params.id, 10);
  const songs = readData();
  const songIndex = songs.findIndex(song => song.id === songId);

  if (songIndex !== -1) {
    songs.splice(songIndex, 1);
    writeData(songs);
    res.status(200).send('Song deleted');
  } else {
    res.status(404).send('Song not found');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
