document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const albumSelect = document.getElementById('album-select');
    const albumInfoSelect = document.getElementById('album-info-select');
    const albumSongs = document.getElementById('album-songs');
    const addSongForm = document.getElementById('add-song-form');
    const updateSongForm = document.getElementById('update-song-form');
    const deleteButton = document.getElementById('delete-button');
    const cancelEditButton = document.getElementById('cancel-edit');
    
    // API selector elements
    const trackSelect = document.getElementById('track-select');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // API link elements
    const trackDetailsLink = document.getElementById('track-details-link');
    const albumInfoLink = document.getElementById('album-info-link');
    const searchLink = document.getElementById('search-link');
    
    // Add smooth scrolling for navigation links
    document.querySelectorAll('.content-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    });
    
    // Cancel edit button
    cancelEditButton.addEventListener('click', () => {
        document.getElementById('edit-delete-section').style.display = 'none';
    });
    
    // Load songs with Spotify and Genius links
    async function loadSongsWithLinks() {
        try {
            const response = await fetch('/node/spotify-songs');
            const data = await response.json();
            const songs = data.localSongs;
            
            songsContainer.innerHTML = '';
            
            // Sort songs by album
            songs.sort((a, b) => a.album.localeCompare(b.album));
            
            // Group songs by album for the dropdowns
            const albums = [...new Set(songs.map(song => song.album))];
            
            // Update album selectors
            albumSelect.innerHTML = '<option value="">Select album...</option>';
            albumInfoSelect.innerHTML = '<option value="">Select an album...</option>';
            
            albums.forEach(album => {
                const option1 = document.createElement('option');
                option1.value = album;
                option1.textContent = album;
                albumSelect.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = album;
                option2.textContent = album;
                albumInfoSelect.appendChild(option2);
            });
            
            // Update track selector
            trackSelect.innerHTML = '<option value="">Select a track...</option>';
            
            songs.forEach(song => {
                // Add to track selector for API navigation
                const trackOption = document.createElement('option');
                trackOption.value = song.title;
                trackOption.textContent = `${song.title} (${song.album})`;
                trackSelect.appendChild(trackOption);
                
                // Display in songs list
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
            songsContainer.innerHTML = '<p>Error loading songs. Please try again later.</p>';
        }
    }
    
    // Handle API selector events
    trackSelect.addEventListener('change', () => {
        const selectedTrack = trackSelect.value;
        if (selectedTrack) {
            trackDetailsLink.href = `/node/track-details/${encodeURIComponent(selectedTrack)}`;
            trackDetailsLink.setAttribute('target', '_blank');
        } else {
            trackDetailsLink.href = '#';
            trackDetailsLink.removeAttribute('target');
        }
    });
    
    albumInfoSelect.addEventListener('change', () => {
        const selectedAlbum = albumInfoSelect.value;
        if (selectedAlbum) {
            albumInfoLink.href = `/node/album-info/${encodeURIComponent(selectedAlbum)}`;
            albumInfoLink.setAttribute('target', '_blank');
        } else {
            albumInfoLink.href = '#';
            albumInfoLink.removeAttribute('target');
        }
    });
    
    // Handle search functionality
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchLink.href = `/node/search/${encodeURIComponent(query)}`;
            searchLink.setAttribute('target', '_blank');
            window.open(searchLink.href, '_blank');
        } else {
            alert('Please enter a search term');
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchButton.click();
        }
    });
    
    // Prevent API link clicks when no selection is made
    document.querySelectorAll('.api-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#') {
                e.preventDefault();
                alert('Please make a selection first');
            }
        });
    });
    
    // Handle album selection for display
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
                // Scroll to see the new song in the list
                document.getElementById('songs-section').scrollIntoView({ behavior: 'smooth' });
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
                // Scroll back to the songs list
                document.getElementById('songs-section').scrollIntoView({ behavior: 'smooth' });
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
                // Scroll back to the songs list
                document.getElementById('songs-section').scrollIntoView({ behavior: 'smooth' });
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