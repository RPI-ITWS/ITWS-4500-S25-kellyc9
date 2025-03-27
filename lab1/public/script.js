document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-list');
    const addSongForm = document.getElementById('add-song-form');
    const updateSongForm = document.getElementById('update-song-form');
    const updateSongDiv = document.getElementById('edit-delete-section');

    // Fetch and display all songs
    function loadSongs() {
        fetch('/node/songs')
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
        fetch('/node/songs', {
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
        fetch(`/node/songs/${id}`)
            .then(response => response.json())
            .then(song => {
                document.getElementById("edit-delete-section").style.display = "block"; // Show edit form
                document.getElementById("add-song").style.marginTop = "20px"; // Push Add Song form down
    
                // Fill form with song data
                document.getElementById("edit-id").value = song.id;
                document.getElementById("edit-title").value = song.title || "";
                document.getElementById("edit-album").value = song.album || "";
                document.getElementById("edit-release_year").value = song.release_year || "";
                document.getElementById("edit-track_number").value = song.track_number || "";
            })
            .catch(error => console.error("Error fetching song:", error));
    };
    

    updateSongForm.addEventListener('submit', event => {
            event.preventDefault();
        
            const id = document.getElementById("edit-id").value;
            const updatedSong = {
                title: document.getElementById("edit-title").value,
                album: document.getElementById("edit-album").value,
                release_year: document.getElementById("edit-release_year").value,
                track_number: document.getElementById("edit-track_number").value
            };
        
            fetch(`/node/songs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedSong)
            })
            .then(response => response.json())
            .then(data => {
                console.log("Song updated:", data);
                document.getElementById("edit-delete-section").style.display = "none"; // Hide edit form after update
                loadSongs(); // Refresh song list
            })
            .catch(error => console.error("Error updating song:", error));
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