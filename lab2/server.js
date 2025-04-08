const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const dataPath = path.join(__dirname, 'data.json');
const readData = () => JSON.parse(fs.readFileSync(dataPath));
const writeData = (data) => fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

// Spotify API Credentials
const SPOTIFY_CLIENT_ID = "abaf98e3885e4b1780ac4f249b9c603c";
const SPOTIFY_CLIENT_SECRET = "48d819a941f746469ccaedbff1cb02ab";

// Genius API Credentials
const GENIUS_ACCESS_TOKEN = "Mx1Jtkdg34TcRW14yl8J3udQglgZ0MCz2i1-q7vUvDIVzK3raIcwWGIBaCaw1JNL";

// Fetch Spotify Access Token
const getSpotifyToken = async () => {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials', 
        { 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
            }
        }
    );
    return response.data.access_token;
};

// Normalize string for better matching
const normalize = (str) => str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '') // Remove special characters
    .trim();

// Original Lab 2 Endpoint: Fetch all songs (local + Spotify + Genius)
app.get('//spotify-songs', async (req, res) => {
    try {
        const SPOTIFY_ACCESS_TOKEN = await getSpotifyToken();
        const localSongs = readData();

        const enrichedSongs = await Promise.all(localSongs.map(async (song) => {
            let spotifyData = null;
            let geniusUrl = null;

            try {
                // Fetch Spotify data
                const spotifyRes = await axios.get('https://api.spotify.com/v1/search', {
                    headers: { Authorization: `Bearer ${SPOTIFY_ACCESS_TOKEN}` },
                    params: {
                        q: `${song.title} ${song.album} kendrick lamar`,
                        type: 'track',
                        limit: 1
                    }
                });
                const track = spotifyRes.data.tracks.items[0];
                if (track) {
                    spotifyData = {
                        spotify_url: track.external_urls.spotify,
                        album: track.album.name
                    };
                }
            } catch (err) {
                console.error(`Spotify API error for "${song.title}":`, err.message);
            }

            try {
                // Fetch Genius data
                const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(song.title)}`, {
                    headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
                });
                geniusUrl = geniusRes.data.response.hits[0]?.result.url || null;
            } catch (err) {
                console.error(`Genius API error for "${song.title}":`, err.message);
            }

            return {
                ...song,
                ...spotifyData,
                genius_url: geniusUrl
            };
        }));

        res.json(enrichedSongs);
    } catch (error) {
        console.error('Error fetching songs:', error.message);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// New Endpoint from Lab 1: Fetch a single song by title
app.get('//songs/:title', (req, res) => {
    const { title } = req.params;
    const localSongs = readData();
    const song = localSongs.find(song => normalize(song.title) === normalize(title));

    if (!song) {
        return res.status(404).json({ error: 'Song not found' });
    }

    res.json(song);
});

// New Endpoint from Lab 1: Add a new song
app.post('//songs', async (req, res) => {
    const { title, album } = req.body;

    if (!title || !album) {
        return res.status(400).json({ error: 'Title and album are required' });
    }

    try {
        const localSongs = readData();

        // Check if song already exists
        if (localSongs.some(song => normalize(song.title) === normalize(title))) {
            return res.status(400).json({ error: 'Song already exists' });
        }

        const newSong = { title, album };
        localSongs.push(newSong);
        writeData(localSongs);

        res.status(201).json(newSong);
    } catch (error) {
        console.error('Error adding song:', error.message);
        res.status(500).json({ error: 'Failed to add song' });
    }
});

// New Endpoint from Lab 1: Update a song's album
app.put('//songs/:title', (req, res) => {
    const { title } = req.params;
    const { album } = req.body;

    if (!album) {
        return res.status(400).json({ error: 'Album is required' });
    }

    try {
        const localSongs = readData();
        const songIndex = localSongs.findIndex(song => normalize(song.title) === normalize(title));

        if (songIndex === -1) {
            return res.status(404).json({ error: 'Song not found' });
        }

        localSongs[songIndex].album = album;
        writeData(localSongs);

        res.json(localSongs[songIndex]);
    } catch (error) {
        console.error('Error updating song:', error.message);
        res.status(500).json({ error: 'Failed to update song' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));