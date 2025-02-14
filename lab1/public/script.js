document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const addSongForm = document.getElementById('add-song-form');
    const updateSongForm = document.getElementById('update-song-form');
    const updateSongDiv = document.getElementById('update-song');

    // Fetch and display all songs
    function loadSongs() {
        fetch('node/songs')
            .then(response => response.json())
            .then(songs => {
                songsContainer.innerHTML = ''; // Clear existing list
                songs.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.innerHTML = `
                        <strong>${song.title}</strong> (${song.album}, ${song.release_year}, Track ${song.track_number})
                        <button onclick="deleteSong(${song.id})">Delete</button>
                        <button onclick="editSong(${song.id})">Edit</button>
                    `;
                    songsContainer.appendChild(songItem);
                });
            });
    }

    // Add a new song
    addSongForm.addEventListener('submit', event => {
        event.preventDefault();
        const newSong = {
            title: document.getElementById('title').value,
            album: document.getElementById('album').value,
            release_year: document.getElementById('release_year').value,
            track_number: document.getElementById('track_number').value
        };
        fetch('node/songs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSong)
        })
            .then(response => {
                if (response.ok) {
                    loadSongs();
                    addSongForm.reset();
                } else {
                    alert('Failed to add song');
                }
            });
    });

    // Edit a song
    window.editSong = function (id) {
        fetch(`node/songs/${id}`)
            .then(response => response.json())
            .then(song => {
                updateSongDiv.style.display = 'block';
                document.getElementById('update-id').value = song.id;
                document.getElementById('update-title').value = song.title;
                document.getElementById('update-album').value = song.album;
                document.getElementById('update-release_year').value = song.release_year;
                document.getElementById('update-track_number').value = song.track_number;
            });
    };

    updateSongForm.addEventListener('submit', event => {
        event.preventDefault();
        const id = document.getElementById('update-id').value;
        const updatedSong = {
            title: document.getElementById('update-title').value,
            album: document.getElementById('update-album').value,
            release_year: document.getElementById('update-release_year').value,
            track_number: document.getElementById('update-track_number').value
        };
        fetch(`node/songs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSong)
        })
            .then(response => {
                if (response.ok) {
                    loadSongs();
                    updateSongDiv.style.display = 'none';
                } else {
                    alert('Failed to update song');
                }
            });
    });

    // Delete a song
    window.deleteSong = function (id) {
        fetch(`/node/songs/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    loadSongs();
                } else {
                    alert('Failed to delete song');
                }
            });
    };

    // Initial load
    loadSongs();
});