const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const dataPath = path.join(__dirname, 'data.json');
const readData = () => JSON.parse(fs.readFileSync(dataPath));

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

// Get Kendrick Lamar's songs from Spotify and merge with local JSON
app.get('/node/spotify-songs', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const response = await axios.get(
            'https://api.spotify.com/v1/search?q=kendrick+lamar&type=track&limit=10', 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const spotifySongs = response.data.tracks.items.map(song => ({
            title: song.name,
            album: song.album.name,
            spotify_url: song.external_urls.spotify
        }));

        // Merge with local JSON data
        const localSongs = readData();
        res.json({ localSongs, spotifySongs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Spotify songs', details: error.message });
    }
});

// Get Genius Lyrics for a Song (Similar to the Weather API Example)
app.get('/node/lyrics/:song', async (req, res) => {
    try {
        const song = req.params.song;
        const response = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(song)}`, {
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });

        const songUrl = response.data.response.hits[0]?.result.url;
        if (!songUrl) return res.status(404).json({ error: "Lyrics not found" });

        res.json({ song, lyrics_url: songUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lyrics', details: error.message });
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));