/**
 * PRIME VIDEO INJECTION SCRIPT
 *
 * PURPOSE:
 * Bridges the gap between the Extension (Content Script) and Amazon's internal React State.
 *
 * CRITICAL LOGIC EXPLANATION ("Smart Selector"):
 * Amazon Prime Video is a Single Page Application (SPA). When navigating from a Movie Details page
 * to the actual video player, the "Preview Video" (used in the background of the details page)
 * often remains in the DOM but is hidden (or visually obscured).
 *
 * Standard `document.querySelector('video')` often grabs this hidden preview element (Index 0)
 * instead of the actual movie player (Index 1), causing control commands to fail.
 *
 * SOLUTION:
 * The `findActiveVideo()` function implements a robust heuristic:
 * 1. FILTER: Ignores videos with no src or 0x0 dimensions.
 * 2. SORT BY SIZE: Prioritizes the video with the largest screen area (The Main Player).
 * 3. TIE-BREAKER: If sizes are equal, picks the video appearing LATER in the DOM (Overlay).
 *
 * REACT FIBER TRAVERSAL:
 * We cannot use `video.play()` directly because Amazon's state machine overrides it.
 * We must traverse the internal React Fiber tree (`__reactFiber$`) attached to the video's
 * container to find the `context` object, which exposes the official `player` controller.
 */

(function () {
    'use strict';

    if (window.__liftedSyncPrimeInjected) return;
    window.__liftedSyncPrimeInjected = true;

    var currentVideoElement = null;

    function getReactFiber(domNode) {
        var key = Object.keys(domNode).find(function (k) {
            return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
        });
        return key ? domNode[key] : null;
    }

    function findActiveVideo() {
        var allVideos = Array.from(document.querySelectorAll('video'));

        var candidates = allVideos.filter(function (v) {
            if (!v.src) return false;
            var rect = v.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        if (candidates.length === 0) return null;

        candidates.sort(function (a, b) {
            var rectA = a.getBoundingClientRect();
            var rectB = b.getBoundingClientRect();
            var areaA = rectA.width * rectA.height;
            var areaB = rectB.width * rectB.height;

            if (areaB !== areaA) {
                return areaB - areaA;
            }
            return allVideos.indexOf(b) - allVideos.indexOf(a);
        });

        return candidates[0];
    }

    function findPrimeContext() {
        var video = findActiveVideo();

        if (!video) {
            return null;
        }

        if (video !== currentVideoElement) {
            currentVideoElement = video;
        }

        var domNode = video;
        var fiber = null;

        for (var i = 0; i < 10; i++) {
            fiber = getReactFiber(domNode);
            if (fiber) break;
            domNode = domNode.parentElement;
            if (!domNode) return null;
        }

        if (!fiber) return null;

        var current = fiber;
        for (var j = 0; j < 15; j++) {
            if (!current) break;
            var props = current.memoizedProps || {};

            if (props.context && props.context.player) {
                return props.context;
            }
            current = current.return;
        }

        return null;
    }

    function initControls() {
        if (!document.body) {
            setTimeout(initControls, 100);
            return;
        }

        if (document.getElementById('liftedSync-pv-controls')) {
            return;
        }

        var controls = document.createElement('div');
        controls.id = 'liftedSync-pv-controls';
        controls.style.display = 'none';

        var playBtn = document.createElement('div');
        playBtn.id = 'liftedSync-pv-play';
        playBtn.addEventListener('click', function () {
            try {
                var ctx = findPrimeContext();
                if (ctx && ctx.player && ctx.player.play) {
                    ctx.player.play();
                } else {
                    console.warn('[LiftedSync] Prime Video: Play failed - no player context');
                }
            } catch (e) {
                console.error('[LiftedSync] Prime Video: Play failed:', e);
            }
        });

        var pauseBtn = document.createElement('div');
        pauseBtn.id = 'liftedSync-pv-pause';
        pauseBtn.addEventListener('click', function () {
            try {
                var ctx = findPrimeContext();
                if (ctx && ctx.player && ctx.player.pause) {
                    ctx.player.pause();
                } else {
                    console.warn('[LiftedSync] Prime Video: Pause failed - no player context');
                }
            } catch (e) {
                console.error('[LiftedSync] Prime Video: Pause failed:', e);
            }
        });

        var seekBtn = document.createElement('div');
        seekBtn.id = 'liftedSync-pv-seek';
        seekBtn.addEventListener('click', function () {
            try {
                var timeMs = parseInt(seekBtn.getAttribute('data-time') || '0', 10);
                var ctx = findPrimeContext();
                if (ctx && ctx.player && ctx.player.seek && !isNaN(timeMs)) {
                    ctx.player.seek(timeMs);
                } else {
                    console.warn('[LiftedSync] Prime Video: Seek failed - no player context');
                }
            } catch (e) {
                console.error('[LiftedSync] Prime Video: Seek failed:', e);
            }
        });

        controls.appendChild(playBtn);
        controls.appendChild(pauseBtn);
        controls.appendChild(seekBtn);
        document.body.appendChild(controls);
    }

    initControls();
})();