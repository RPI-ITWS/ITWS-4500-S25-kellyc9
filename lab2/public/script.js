// Fetch songs from the backend and display them
fetch('//spotify-songs')
  .then(res => res.json())
  .then(data => {
    const songsContainer = document.getElementById('songs-container');
    songsContainer.innerHTML = ''; // Clear existing content

    data.localSongs.forEach(song => {
      const songItem = document.createElement('li');
      songItem.innerHTML = `
        ${song.title} (${song.album})
        ${song.spotify_url ? `<button onclick="playSong('${song.spotify_url}')">▶️ Play</button>` : ''}
        ${song.genius_url ? `<a href="${song.genius_url}" target="_blank">Lyrics</a>` : ''}
      `;
      songsContainer.appendChild(songItem);
    });
  })
  .catch(err => {
    console.error('Error fetching songs:', err);
  });

// Function to play a song using Spotify Embed Player
function playSong(spotifyUrl) {
  const embedContainer = document.getElementById('embed-container');
  embedContainer.innerHTML = `
    <iframe src="${spotifyUrl.replace('track', 'embed/track')}" 
            width="300" 
            height="80" 
            frameborder="0" 
            allowtransparency="true" 
            allow="encrypted-media">
    </iframe>
  `;
}