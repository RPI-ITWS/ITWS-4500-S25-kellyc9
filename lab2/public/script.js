document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const albumSelect = document.getElementById('album-select');
    const albumSongs = document.getElementById('album-songs');
    const addSongForm = document.getElementById('add-song-form');
    const updateSongForm = document.getElementById('update-song-form');
    const deleteButton = document.getElementById('delete-button');
    
    // Load songs with Spotify and Genius links
    async function loadSongsWithLinks() {
        try {
            const response = await fetch('/node/spotify-songs');
            const data = await response.json();
            const songs = data.localSongs;
            
            songsContainer.innerHTML = '';
            
            // Sort songs by album
            songs.sort((a, b) => a.album.localeCompare(b.album));
            
            // Group songs by album for the dropdown
            const albums = [...new Set(songs.map(song => song.album))];
            albumSelect.innerHTML = '<option value="">Select album...</option>';
            albums.forEach(album => {
                const option = document.createElement('option');
                option.value = album;
                option.textContent = album;
                albumSelect.appendChild(option);
            });
            
            // Display all songs
            songs.forEach(song => {
                const songItem = document.createElement('li');
                songItem.innerHTML = `
                    <strong>${song.title}</strong> (${song.album}, ${song.release_year}, Track ${song.track_number})
                    ${song.spotify_url ? `<a href="${song.spotify_url}" target="_blank">Listen on Spotify</a>` : ''}
                    ${song.genius_url ? `<a href="${song.genius_url}" target="_blank">Lyrics on Genius</a>` : ''}
                    <button class="edit-btn" data-id="${song.id}">Edit</button>
                    <button class="delete-btn" data-id="${song.id}">Delete</button>
                `;
                songsContainer.appendChild(songItem);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', () => editSong(button.dataset.id));
            });
            
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', () => deleteSong(button.dataset.id));
            });
        } catch (error) {
            console.error('Error loading songs:', error);
        }
    }
    
    // Handle album selection
    albumSelect.addEventListener('change', async () => {
        const selectedAlbum = albumSelect.value;
        if (!selectedAlbum) {
            albumSongs.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`/node/album-stats/${encodeURIComponent(selectedAlbum)}`);
            const albumData = await response.json();
            
            albumSongs.innerHTML = `
                <h3>${albumData.name} (${albumData.year})</h3>
                <p>Tracks: ${albumData.trackCount}</p>
            `;
            
            albumData.tracks.sort((a, b) => a.track_number - b.track_number);
            
            albumData.tracks.forEach(track => {
                const trackItem = document.createElement('li');
                trackItem.innerHTML = `
                    <strong>${track.title}</strong> (Track ${track.track_number})
                    ${track.spotify_url ? `<a href="${track.spotify_url}" target="_blank">Listen on Spotify</a>` : ''}
                    ${track.genius_url ? `<a href="${track.genius_url}" target="_blank">Lyrics on Genius</a>` : ''}
                `;
                albumSongs.appendChild(trackItem);
            });
        } catch (error) {
            console.error('Error loading album:', error);
            albumSongs.innerHTML = '<p>Error loading album details</p>';
        }
    });
    
    // Add a new song
    addSongForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const newSong = {
            title: document.getElementById('title').value,
            album: document.getElementById('album').value,
            release_year: parseInt(document.getElementById('release_year').value),
            track_number: parseInt(document.getElementById('track_number').value)
        };
        
        try {
            const response = await fetch('/node/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSong)
            });
            
            if (response.ok) {
                addSongForm.reset();
                loadSongsWithLinks(); // Reload the songs list
            } else {
                const error = await response.json();
                alert(`Failed to add song: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error adding song:', error);
            alert('Failed to add song due to a network error.');
        }
    });
    
    // Edit song function
    window.editSong = async function(id) {
        try {
            const response = await fetch(`/node/songs/${id}`);
            const song = await response.json();
            
            document.getElementById('edit-delete-section').style.display = 'block';
            document.getElementById('edit-id').value = song.id;
            document.getElementById('edit-title').value = song.title || '';
            document.getElementById('edit-album').value = song.album || '';
            document.getElementById('edit-release_year').value = song.release_year || '';
            document.getElementById('edit-track_number').value = song.track_number || '';
            
            // Setup delete button for this song
            deleteButton.onclick = () => deleteSong(song.id);
            
            // Scroll to the edit form
            document.getElementById('edit-delete-section').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error fetching song details:', error);
            alert('Failed to load song details for editing.');
        }
    };
    
    // Update song form submission
    updateSongForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const updatedSong = {
            title: document.getElementById('edit-title').value,
            album: document.getElementById('edit-album').value,
            release_year: parseInt(document.getElementById('edit-release_year').value),
            track_number: parseInt(document.getElementById('edit-track_number').value)
        };
        
        try {
            const response = await fetch(`/node/songs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSong)
            });
            
            if (response.ok) {
                document.getElementById('edit-delete-section').style.display = 'none';
                loadSongsWithLinks(); // Reload the songs list
            } else {
                const error = await response.json();
                alert(`Failed to update song: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating song:', error);
            alert('Failed to update song due to a network error.');
        }
    });
    
    // Delete song function
    window.deleteSong = async function(id) {
        if (!confirm('Are you sure you want to delete this song?')) {
            return;
        }
        
        try {
            const response = await fetch(`/node/songs/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                document.getElementById('edit-delete-section').style.display = 'none';
                loadSongsWithLinks(); // Reload the songs list
            } else {
                alert('Failed to delete song');
            }
        } catch (error) {
            console.error('Error deleting song:', error);
            alert('Failed to delete song due to a network error.');
        }
    };
    
    // Initial load
    loadSongsWithLinks();
});