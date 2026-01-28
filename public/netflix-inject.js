(function() {
  // Prevent double injection
  if (window.__liftedSyncInjected) return;
  window.__liftedSyncInjected = true;

  function getNetflixPlayer() {
    try {
      var videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
      var sessionIds = videoPlayer.getAllPlayerSessionIds();
      if (sessionIds.length === 0) return null;
      return videoPlayer.getVideoPlayerBySessionId(sessionIds[0]);
    } catch (e) {
      console.error('[LiftedSync] Failed to get Netflix player:', e);
      return null;
    }
  }

  // Create play control
  var playElem = document.createElement('div');
  playElem.id = 'liftedSync-play';
  playElem.style.display = 'none';
  playElem.addEventListener('click', function() {
    try {
      var player = getNetflixPlayer();
      if (player) {
        player.play();
        console.log('[LiftedSync] Play command executed');
      } else {
        console.warn('[LiftedSync] Play failed: no player found');
      }
    } catch (e) {
      console.error('[LiftedSync] Play failed:', e);
    }
  });

  // Create pause control
  var pauseElem = document.createElement('div');
  pauseElem.id = 'liftedSync-pause';
  pauseElem.style.display = 'none';
  pauseElem.addEventListener('click', function() {
    try {
      var player = getNetflixPlayer();
      if (player) {
        player.pause();
        console.log('[LiftedSync] Pause command executed');
      } else {
        console.warn('[LiftedSync] Pause failed: no player found');
      }
    } catch (e) {
      console.error('[LiftedSync] Pause failed:', e);
    }
  });

  // Create seek control
  var seekElem = document.createElement('div');
  seekElem.id = 'liftedSync-seek';
  seekElem.style.display = 'none';
  seekElem.addEventListener('click', function() {
    try {
      var timeMs = Number(seekElem.getAttribute('data-time'));
      var player = getNetflixPlayer();
      if (player && !isNaN(timeMs)) {
        player.seek(timeMs);
        console.log('[LiftedSync] Seek command executed to:', timeMs, 'ms');
      } else {
        console.warn('[LiftedSync] Seek failed: no player or invalid time');
      }
    } catch (e) {
      console.error('[LiftedSync] Seek failed:', e);
    }
  });

  document.body.appendChild(playElem);
  document.body.appendChild(pauseElem);
  document.body.appendChild(seekElem);

  console.log('[LiftedSync] Netflix control elements injected successfully');
})();