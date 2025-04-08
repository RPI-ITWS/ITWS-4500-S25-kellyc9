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

// Normalize string for better matching
const normalize = (str) => str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '') // Remove special characters
    .trim();

// Get a frontend HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get Kendrick Lamar's songs from Spotify and merge with local JSON
app.get('//spotify-songs', async (req, res) => {
    try {
        // Fetch the Spotify access token
        const SPOTIFY_ACCESS_TOKEN = await getSpotifyToken();

        const localSongs = readData();

        const enrichedLocalSongs = await Promise.all(localSongs.map(async (localSong) => {
            let spotifyMatch = null;

            try {
                // Fetch Spotify data for the current song
                const spotifyRes = await axios.get('https://api.spotify.com/v1/search', {
                    headers: { Authorization: `Bearer ${SPOTIFY_ACCESS_TOKEN}` },
                    params: {
                        q: `${localSong.title} ${localSong.album} kendrick lamar`, // Include album and artist
                        type: 'track',
                        limit: 5 // Fetch multiple results
                    }
                });

                // Validate the results to find the best match
                const track = spotifyRes.data.tracks.items.find(item => 
                    normalize(item.name) === normalize(localSong.title) &&
                    normalize(item.album.name) === normalize(localSong.album)
                ) || spotifyRes.data.tracks.items[0]; // Fallback to the first result

                if (track) {
                    spotifyMatch = {
                        title: track.name,
                        album: track.album.name,
                        spotify_url: track.external_urls.spotify
                    };

                    // Log potential mismatches
                    if (normalize(track.name) !== normalize(localSong.title) || normalize(track.album.name) !== normalize(localSong.album)) {
                        console.log(`Potential mismatch for "${localSong.title}": Matched "${track.name}" from album "${track.album.name}"`);
                    }
                }
            } catch (err) {
                console.error(`Spotify API error for "${localSong.title}":`, err.message);
            }

            // Log unmatched songs
            if (!spotifyMatch) {
                console.log(`No Spotify match for "${localSong.title}"`);
            }

            // Fetch Genius URL
            let geniusUrl = null;
            try {
                const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(localSong.title)}`, {
                    headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
                });
                geniusUrl = geniusRes.data.response.hits[0]?.result.url || null;
            } catch (e) {
                console.error(`Genius API error for "${localSong.title}":`, e.message);
            }

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