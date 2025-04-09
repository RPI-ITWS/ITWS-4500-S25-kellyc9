// Utility functions
const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
};

// Show/hide sections
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionName}-section`).style.display = 'block';
}

// Load and display songs
async function loadSongs() {
    try {
        const response = await fetch('/node/spotify-songs');
        const data = await response.json();
        const container = document.getElementById('songs-container');
        container.innerHTML = '';

        data.localSongs.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <h3>${song.title}</h3>
                <p>Album: ${song.album}</p>
                <p>Year: ${song.release_year}</p>
                <div class="song-links">
                    ${song.spotify_url ? `<a href="${song.spotify_url}" target="_blank">Play on Spotify</a>` : ''}
                    ${song.genius_url ? `<a href="${song.genius_url}" target="_blank">View Lyrics</a>` : ''}
                </div>
            `;
            container.appendChild(songCard);
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load and display album stats
async function loadAlbumStats(albumName) {
    try {
        const response = await fetch(`/node/album-stats/${encodeURIComponent(albumName)}`);
        const data = await response.json();
        const container = document.getElementById('album-stats-container');
        
        container.innerHTML = `
            <h3>${data.name}</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Track Count</h4>
                    <p>${data.trackCount}</p>
                </div>
                <div class="stat-card">
                    <h4>Total Duration</h4>
                    <p>${formatDuration(data.totalDuration)}</p>
                </div>
                <div class="stat-card">
                    <h4>Average Popularity</h4>
                    <p>${data.averagePopularity.toFixed(1)}</p>
                </div>
            </div>
            <h4>Tracks:</h4>
            <div class="grid-container">
                ${data.tracks.map(track => `
                    <div class="song-card">
                        <h3>${track.title}</h3>
                        <p>Duration: ${formatDuration(track.duration_ms)}</p>
                        <p>Popularity: ${track.popularity}</p>
                        <p>Genius Views: ${track.genius_stats.pageviews.toLocaleString()}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading album stats:', error);
    }
}

// Load and display songs by year
async function loadSongsByYear(year) {
    try {
        const response = await fetch(`/node/songs/year/${year}`);
        const data = await response.json();
        const container = document.getElementById('year-songs-container');

        container.innerHTML = `
            <h3>${year} - ${data.song_count} songs</h3>
            <div class="grid-container">
                ${data.songs.map(song => `
                    <div class="song-card">
                        <h3>${song.title}</h3>
                        <p>Album: ${song.album}</p>
                        ${song.spotify_data ? `
                            <p>Popularity: ${song.spotify_data.popularity}</p>
                            <a href="${song.spotify_data.external_urls.spotify}" target="_blank">Play on Spotify</a>
                        ` : ''}
                        ${song.genius_data ? `
                            <p>Genius Views: ${song.genius_data.stats?.pageviews?.toLocaleString() || 'N/A'}</p>
                            <a href="${song.genius_data.url}" target="_blank">View Lyrics</a>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading songs by year:', error);
    }
}

// Add new song
async function addSong(event) {
    event.preventDefault();
    const title = document.getElementById('song-title').value;
    const album = document.getElementById('album-name').value;

    try {
        const response = await fetch('/node/playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ songTitle: title, albumName: album })
        });

        if (response.ok) {
            alert('Song added successfully!');
            document.getElementById('add-song-form').reset();
            loadSongs();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error adding song:', error);
        alert('Failed to add song');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    
    // Set up form submission
    document.getElementById('add-song-form').addEventListener('submit', addSong);

    // Set up album select
    const albumSelect = document.getElementById('album-select');
    albumSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadAlbumStats(e.target.value);
        }
    });

    // Set up year select
    const yearSelect = document.getElementById('year-select');
    const years = [2010, 2011, 2012, 2015, 2016, 2017, 2022];
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    yearSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadSongsByYear(e.target.value);
        }
    });
});