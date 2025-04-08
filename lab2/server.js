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
const SPOTIFY_CLIENT_ID = "your_spotify_client_id";
const SPOTIFY_CLIENT_SECRET = "your_spotify_client_secret";

// Genius API Credentials
const GENIUS_ACCESS_TOKEN = "your_genius_access_token";

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
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();

// Get a frontend HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get Kendrick Lamar's songs from Spotify and merge with local JSON
app.get('//spotify-songs', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const response = await axios.get(
            'https://api.spotify.com/v1/search?q=kendrick+lamar&type=track&limit=50', 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const spotifySongs = response.data.tracks.items.map(song => ({
            title: song.name,
            album: song.album.name,
            spotify_url: song.external_urls.spotify
        }));

        // Merge with local JSON data
        const localSongs = readData();

        // Enrich localSongs with Spotify and Genius links
        const enrichedLocalSongs = await Promise.all(localSongs.map(async (localSong) => {
            const spotifyMatch = spotifySongs.find(song => normalize(song.title) === normalize(localSong.title));
            let geniusUrl = null;

            try {
                const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(localSong.title)}`, {
                    headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
                });
                geniusUrl = geniusRes.data.response.hits[0]?.result.url || null;
            } catch (e) {
                console.error(`Genius API error for "${localSong.title}":`, e.message);
                geniusUrl = null;
            }

            // Debug logging for Spotify match
            console.log(`Spotify match for "${localSong.title}":`, spotifyMatch ? spotifyMatch.spotify_url : 'No match found');

            return {
                ...localSong,
                spotify_url: spotifyMatch ? spotifyMatch.spotify_url : null,
                genius_url: geniusUrl
            };
        }));

        res.json({ localSongs: enrichedLocalSongs });
    } catch (error) {
        console.error('Error fetching Spotify songs:', error.message);
        res.status(500).json({ error: 'Failed to fetch Spotify songs', details: error.message });
    }
});

// Get Genius Lyrics for a Song
app.get('//lyrics/:song', async (req, res) => {
    try {
        const song = req.params.song;
        const response = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(song)}`, {
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });

        const songUrl = response.data.response.hits[0]?.result.url;
        if (!songUrl) return res.status(404).json({ error: "Lyrics not found" });

        res.json({ song, lyrics_url: songUrl });
    } catch (error) {
        console.error(`Error fetching lyrics for "${req.params.song}":`, error.message);
        res.status(500).json({ error: 'Failed to fetch lyrics', details: error.message });
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));