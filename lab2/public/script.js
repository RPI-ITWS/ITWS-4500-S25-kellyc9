
document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const lyricsContainer = document.getElementById('lyrics-container');

    // Fetch and display songs (local only)
    function loadSongs() {
        fetch('/node/spotify-songs')
            .then(response => response.json())
            .then(data => {
                songsContainer.innerHTML = '<h2>Songs</h2>';
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

    // Fetch and display lyrics
    window.getLyrics = function(song) {
        fetch(`/node/lyrics/${encodeURIComponent(song)}`)
            .then(response => response.json())
            .then(data => {
                lyricsContainer.innerHTML = data.lyrics_url
                    ? `<a href="${data.lyrics_url}" target="_blank">View Lyrics on Genius</a>`
                    : 'Lyrics not found';
            });
    };

    loadSongs();
});
