document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const albumSongs = document.getElementById('album-songs');

    function loadSongs() {
        fetch('/node/spotify-songs')
            .then(response => response.json())
            .then(data => {
                songsContainer.innerHTML = '';
                data.localSongs.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.innerHTML = `
                        ${song.title} (${song.album})
                        ${song.spotify_url ? `<a href="${song.spotify_url}" target="_blank">▶️</a>` : ''}
                        ${song.genius_url ? `<a href="${song.genius_url}" target="_blank">Lyrics</a>` : ''}
                    `;
                    songsContainer.appendChild(songItem);
                });

                // Populate dropdowns after loading songs
                populateDropdowns(data.localSongs);
            });
    }

    function populateDropdowns(songs) {
        // Populate album dropdown
        const albums = [...new Set(songs.map(song => song.album))];
        const albumSelect = document.getElementById('album-select');
        albumSelect.innerHTML = '<option value="">Select album...</option>';
        albums.forEach(album => {
            const option = document.createElement('option');
            option.value = album;
            option.textContent = album;
            albumSelect.appendChild(option);
        });
    }

    document.getElementById('album-select').addEventListener('change', (e) => {
        if (!e.target.value) {
            albumSongs.innerHTML = '';
            return;
        }

        fetch(`/node/album-stats/${encodeURIComponent(e.target.value)}`)
            .then(response => response.json())
            .then(data => {
                albumSongs.innerHTML = '';
                data.tracks.forEach(track => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        ${track.title}
                        ${track.spotify_url ? `<a href="${track.spotify_url}" target="_blank">▶️</a>` : ''}
                        ${track.genius_url ? `<a href="${track.genius_url}" target="_blank">Lyrics</a>` : ''}
                    `;
                    albumSongs.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error:', error);
                albumSongs.innerHTML = 'Error loading album songs';
            });
    });

    loadSongs();
});