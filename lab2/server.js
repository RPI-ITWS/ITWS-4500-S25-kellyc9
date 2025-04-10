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

// Get a list of all songs (basic)
app.get('//songs', (req, res) => {
    const songs = readData();
    res.json(songs);
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
app.post('//songs', async (req, res) => {
    try {
        const newSong = req.body;
        const songs = readData();

        // Ensure unique IDs
        newSong.id = songs.length ? Math.max(...songs.map(song => song.id)) + 1 : 1;
        
        songs.push(newSong);
        writeData(songs);
        
        // Enrich the new song with Spotify and Genius data
        const token = await getSpotifyToken();
        let spotifyMatch = null;
        
        try {
            const spotifyRes = await fetchSpotifyDataWithCache(`${newSong.title} ${newSong.album} kendrick lamar`, token);
            const track = spotifyRes.find(item => 
                normalize(item.name) === normalize(newSong.title) &&
                normalize(item.album.name) === normalize(newSong.album)
            ) || spotifyRes[0];

            if (track) {
                spotifyMatch = {
                    spotify_url: track.external_urls.spotify
                };
            }
        } catch (err) {
            console.error(`Spotify API error for "${newSong.title}":`, err.message);
        }
        
        let geniusUrl = null;
        try {
            const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(newSong.title)}`, {
                headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
            });
            geniusUrl = geniusRes.data.response.hits[0]?.result.url || null;
        } catch (e) {
            console.error(`Genius API error for "${newSong.title}":`, e.message);
        }
        
        const enrichedNewSong = {
            ...newSong,
            spotify_url: spotifyMatch ? spotifyMatch.spotify_url : null,
            genius_url: geniusUrl
        };
        
        res.status(201).json(enrichedNewSong);
    } catch (error) {
        console.error('Error adding new song:', error.message);
        res.status(500).json({ error: 'Failed to add song', details: error.message });
    }
});

// Update a specific song by ID
app.put('//songs/:id', async (req, res) => {
    try {
        const songId = parseInt(req.params.id, 10);
        const songs = readData();
        const songIndex = songs.findIndex(song => song.id === songId);

        if (songIndex !== -1) {
            const updatedSong = { ...songs[songIndex], ...req.body };
            songs[songIndex] = updatedSong;
            writeData(songs);
            
            // Enrich the updated song with Spotify and Genius data
            const token = await getSpotifyToken();
            let spotifyMatch = null;
            
            try {
                const spotifyRes = await fetchSpotifyDataWithCache(`${updatedSong.title} ${updatedSong.album} kendrick lamar`, token);
                const track = spotifyRes.find(item => 
                    normalize(item.name) === normalize(updatedSong.title) &&
                    normalize(item.album.name) === normalize(updatedSong.album)
                ) || spotifyRes[0];

                if (track) {
                    spotifyMatch = {
                        spotify_url: track.external_urls.spotify
                    };
                }
            } catch (err) {
                console.error(`Spotify API error for "${updatedSong.title}":`, err.message);
            }
            
            let geniusUrl = null;
            try {
                const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(updatedSong.title)}`, {
                    headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
                });
                geniusUrl = geniusRes.data.response.hits[0]?.result.url || null;
            } catch (e) {
                console.error(`Genius API error for "${updatedSong.title}":`, e.message);
            }
            
            const enrichedUpdatedSong = {
                ...updatedSong,
                spotify_url: spotifyMatch ? spotifyMatch.spotify_url : null,
                genius_url: geniusUrl
            };
            
            res.json(enrichedUpdatedSong);
        } else {
            res.status(404).send('Song not found');
        }
    } catch (error) {
        console.error('Error updating song:', error.message);
        res.status(500).json({ error: 'Failed to update song', details: error.message });
    }
});

// Delete a song by ID
app.delete('//songs/:id', (req, res) => {
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

// Get songs with Spotify and Genius data
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

// Get track details with data from multiple sources
app.get('//track-details/:title', async (req, res) => {
    try {
        const title = req.params.title;
        const songs = readData();
        const localSong = songs.find(song => normalize(song.title) === normalize(title));
        
        if (!localSong) {
            return res.status(404).json({ error: 'Track not found in local database' });
        }
        
        // Get Spotify data
        const token = await getSpotifyToken();
        const spotifyRes = await fetchSpotifyDataWithCache(`${localSong.title} ${localSong.album} kendrick lamar`, token);
        const track = spotifyRes.find(item => 
            normalize(item.name) === normalize(localSong.title)
        ) || spotifyRes[0];
        
        // Get Genius data
        const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(localSong.title)}`, {
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });
        const geniusHit = geniusRes.data.response.hits[0]?.result;
        
        // Combine the data
        const trackDetails = {
            local: {
                id: localSong.id,
                title: localSong.title,
                album: localSong.album,
                release_year: localSong.release_year,
                track_number: localSong.track_number
            },
            spotify: track ? {
                name: track.name,
                album: track.album.name,
                popularity: track.popularity,
                duration_ms: track.duration_ms,
                explicit: track.explicit,
                artists: track.artists.map(artist => ({
                    name: artist.name,
                    spotify_url: artist.external_urls.spotify
                })),
                preview_url: track.preview_url,
                spotify_url: track.external_urls.spotify,
                album_art: track.album.images[0]?.url
            } : null,
            genius: geniusHit ? {
                title: geniusHit.title,
                primary_artist: geniusHit.primary_artist.name,
                url: geniusHit.url,
                thumbnail: geniusHit.header_image_thumbnail_url
            } : null
        };
        
        res.json(trackDetails);
    } catch (error) {
        console.error('Error fetching track details:', error.message);
        res.status(500).json({ error: 'Failed to fetch track details', details: error.message });
    }
});

// Get artist information with songs
app.get('//artist-songs', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        
        // Get artist info from Spotify
        const artistRes = await axios.get('https://api.spotify.com/v1/search', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                q: 'kendrick lamar',
                type: 'artist',
                limit: 1
            }
        });
        
        const artist = artistRes.data.artists.items[0];
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found on Spotify' });
        }
        
        // Get local songs
        const localSongs = readData();
        
        // Get top tracks for the artist from Spotify
        const topTracksRes = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Combine the data
        const result = {
            artist: {
                name: artist.name,
                spotify_url: artist.external_urls.spotify,
                genres: artist.genres,
                popularity: artist.popularity,
                image: artist.images[0]?.url
            },
            top_tracks: topTracksRes.data.tracks.map(track => ({
                name: track.name,
                album: track.album.name,
                release_date: track.album.release_date,
                spotify_url: track.external_urls.spotify,
                preview_url: track.preview_url,
                image: track.album.images[0]?.url,
                // Check if this track exists in our local database
                in_local_database: localSongs.some(song => 
                    normalize(song.title) === normalize(track.name) &&
                    normalize(song.album) === normalize(track.album.name)
                )
            })),
            local_songs: localSongs.map(song => ({
                id: song.id,
                title: song.title,
                album: song.album,
                release_year: song.release_year,
                track_number: song.track_number
            }))
        };
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching artist songs:', error.message);
        res.status(500).json({ error: 'Failed to fetch artist songs', details: error.message });
    }
});

// NEW ENDPOINT: Get song audio features and analysis
app.get('//song-audio-features/:id', async (req, res) => {
    try {
        const songId = parseInt(req.params.id, 10);
        const songs = readData();
        const song = songs.find(s => s.id === songId);
        
        if (!song) {
            return res.status(404).json({ error: 'Song not found in local database' });
        }
        
        const token = await getSpotifyToken();
        
        // Find the track on Spotify
        const spotifyRes = await fetchSpotifyDataWithCache(`${song.title} ${song.album} kendrick lamar`, token);
        
        if (!spotifyRes || spotifyRes.length === 0) {
            return res.status(404).json({ 
                error: 'Song not found on Spotify',
                song_details: {
                    title: song.title,
                    album: song.album
                }
            });
        }
        
        const track = spotifyRes[0]; // Use the first result
        
        // Get audio features for the track
        const audioFeaturesRes = await axios.get(`https://api.spotify.com/v1/audio-features/${track.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get Genius data
        const geniusRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(song.title)}`, {
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });
        
        // Combine all data sources
        const result = {
            local_data: {
                id: song.id,
                title: song.title,
                album: song.album,
                release_year: song.release_year,
                track_number: song.track_number
            },
            spotify_data: {
                name: track.name,
                album: track.album.name,
                album_art: track.album.images[0]?.url,
                popularity: track.popularity,
                explicit: track.explicit,
                duration_ms: track.duration_ms,
                preview_url: track.preview_url,
                spotify_url: track.external_urls.spotify
            },
            audio_features: audioFeaturesRes.data,
            genius_data: geniusRes.data.response.hits.length > 0 ? {
                title: geniusRes.data.response.hits[0].result.title,
                artist: geniusRes.data.response.hits[0].result.primary_artist.name,
                url: geniusRes.data.response.hits[0].result.url,
                image: geniusRes.data.response.hits[0].result.header_image_url
            } : null
        };
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching song audio features:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch song audio features', 
            details: error.message
        });
    }
});

// Get album stats with enhanced info
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

// Get lyrics info for a song
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));