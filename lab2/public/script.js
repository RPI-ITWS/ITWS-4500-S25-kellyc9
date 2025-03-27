document.addEventListener('DOMContentLoaded', () => {
    const songsContainer = document.getElementById('songs-container');
    const lyricsContainer = document.getElementById('lyrics-container');

    // Fetch and display songs (local & Spotify)
    function loadSongs() {
        fetch('//spotify-songs')
            .then(response => response.json())
            .then(data => {
                songsContainer.innerHTML = '<h3>Local Songs</h3>';
                data.localSongs.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.innerHTML = `${song.title} (${song.album})`;
                    songsContainer.appendChild(songItem);
                });

                songsContainer.innerHTML += '<h3>Spotify Songs</h3>';
                data.spotifySongs.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.innerHTML = `
                        <a href="${song.spotify_url}" target="_blank">${song.title}</a> (${song.album})
                        <button onclick="getLyrics('${song.title}')">Get Lyrics</button>
                    `;
                    songsContainer.appendChild(songItem);
                });
            });
    }

    // Fetch and display lyrics
    window.getLyrics = function(song) {
        fetch(`//lyrics/${encodeURIComponent(song)}`)
            .then(response => response.json())
            .then(data => {
                lyricsContainer.innerHTML = data.lyrics_url
                    ? `<a href="${data.lyrics_url}" target="_blank">View Lyrics on Genius</a>`
                    : 'Lyrics not found';
            });
    };

    loadSongs();
});