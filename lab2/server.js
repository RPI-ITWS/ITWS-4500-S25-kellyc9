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

const pLimit = require('p-limit');
const limit = pLimit(5); // Limit to 5 concurrent requests
const spotifyCache = new Map();

const fetchSpotifyData = async (query, token) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                q: query,
                type: 'track',
                limit: 5
            }
        });
        return response.data.tracks.items;
    } catch (err) {
        if (err.response && err.response.status === 429) {
            const retryAfter = parseInt(err.response.headers['retry-after'], 10) * 1000;
            console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            return fetchSpotifyData(query, token);
        } else {
            throw err;
        }
    }
};

const fetchSpotifyDataWithCache = async (query, token) => {
    if (spotifyCache.has(query)) {
        return spotifyCache.get(query);
    }

    const results = await fetchSpotifyData(query, token);
    spotifyCache.set(query, results);
    return results;
};

app.get('//spotify-songs', async (req, res) => {
    try {
        const SPOTIFY_ACCESS_TOKEN = await getSpotifyToken();
        const localSongs = readData();

        const enrichedLocalSongs = await Promise.all(localSongs.map(localSong =>
            limit(async () => {
                let spotifyMatch = null;

                try {
                    const spotifyRes = await fetchSpotifyDataWithCache(`${localSong.title} ${localSong.album} kendrick lamar`, SPOTIFY_ACCESS_TOKEN);
                    const track = spotifyRes.find(item => 
                        normalize(item.name) === normalize(localSong.title) &&
                        normalize(item.album.name) === normalize(localSong.album)
                    ) || spotifyRes[0];

                    if (track) {
                        spotifyMatch = {
                            title: track.name,
                            album: track.album.name,
                            spotify_url: track.external_urls.spotify
                        };
                    }
                } catch (err) {
                    console.error(`Spotify API error for "${localSong.title}":`, err.message);
                }

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
            })
        ));

        res.json({ localSongs: enrichedLocalSongs });
    } catch (error) {
        console.error('Error fetching Spotify songs:', error.message);
        res.status(500).json({ error: 'Failed to fetch Spotify songs', details: error.message });
    }
});

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

app.get('//album-stats/:albumName', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const songs = readData().filter(song => 
            normalize(song.album) === normalize(req.params.albumName)
        );
        
        if (!songs.length) return res.status(404).json({ error: 'Album not found' });
        
        const enrichedSongs = await Promise.all(songs.map(async song => {
            const spotifyRes = await fetchSpotifyDataWithCache(`${song.title} ${song.album} kendrick lamar`, token);
            const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(song.title)}`, {
                headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
            });
            
            return {
                title: song.title,
                track_number: song.track_number,
                spotify_url: spotifyRes[0]?.external_urls?.spotify,
                genius_url: geniusRes.data.response.hits[0]?.result?.url
            };
        }));

        res.json({
            name: req.params.albumName,
            tracks: enrichedSongs,
            year: songs[0].release_year,
            trackCount: songs.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch album stats' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));