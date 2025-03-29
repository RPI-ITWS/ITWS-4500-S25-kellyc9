document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const lyricsContainer = document.getElementById('lyrics-container');

    // Fetch and display songs (local & Spotify)
    function loadSongs() {
        fetch('/node/spotify-songs')
            .then(response => response.json())
            .then(data => {
                songsContainer.innerHTML = '<h3>Local Songs</h3>';
                data.localSongs.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.innerHTML = `
                    ${song.title} (${song.album})
                    ${song.spotify_url ? `<a href="${song.spotify_url}" target="_blank">▶️</a>` : ''}
                    ${song.genius_url ? `<a href="${song.genius_url}" target="_blank">Lyrics</a>` : ''}
                    `;
                    songsContainer.appendChild(songItem);
                });
            });
    }
});