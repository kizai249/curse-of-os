/* ══════════════════════════════════════════════════════════════
   analytics.js — Unified event tracking (Supabase + optional Mixpanel)

   Usage:
     Analytics.track('player_registered', { source: 'organic' });

   Never throws — all errors are console.error only so game flow
   is never interrupted by a tracking failure.
═══════════════════════════════════════════════════════════════ */

const Analytics = (() => {

  // ── Config ─────────────────────────────────────────────────
  // Replace these placeholder strings with real values from:
  // Supabase Dashboard → Settings → API
  // These are read at runtime so you can also inject them via
  // a <script> tag before this file loads:
  //   <script>
  //     window.COS_SUPABASE_URL = 'https://xxxxx.supabase.co';
  //     window.COS_SUPABASE_KEY = 'eyJhbGc...';
  //   </script>
  const SUPABASE_URL = window.COS_SUPABASE_URL || 'SUPABASE_URL_PLACEHOLDER';
  const SUPABASE_KEY = window.COS_SUPABASE_KEY || 'SUPABASE_ANON_KEY_PLACEHOLDER';

  const TABLE = 'game_events';

  // ── Supabase REST endpoint (no bundler needed) ─────────────
  // We use the raw REST API directly so there's zero dependency
  // on the CDN script loading order.
  const INSERT_URL = `${SUPABASE_URL}/rest/v1/${TABLE}`;

  // ── Persistent anonymous player ID ─────────────────────────
  const PLAYER_ID_KEY = 'cos_analytics_pid';

  function _getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  // ── Core track function ────────────────────────────────────
  async function track(eventName, properties = {}) {
    if (!eventName) return;

    // Bail silently if no real URL configured yet
    if (SUPABASE_URL === 'SUPABASE_URL_PLACEHOLDER') return;

    const payload = {
      event_name: eventName,
      player_id:  _getPlayerId(),
      properties: { ...properties, _ua: navigator.userAgent.slice(0, 60) },
    };

    try {
      const res = await fetch(INSERT_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(payload),
        keepalive: true, // survives page unload (session_ended)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[Analytics] Supabase insert failed:', res.status, text);
      }

    } catch (err) {
      console.error('[Analytics] trackEvent failed:', eventName, err);
    }

    // ── Optional Mixpanel passthrough ────────────────────────
    // Only fires if the Mixpanel snippet has been added to <head>
    try {
      if (window.mixpanel && typeof window.mixpanel.track === 'function') {
        window.mixpanel.track(eventName, properties);
      }
    } catch (err) {
      console.error('[Analytics] Mixpanel track failed:', eventName, err);
    }
  }

  // ── Session timer ─────────────────────────────────────────
  // Tracks time since Analytics.init() was called.
  let _sessionStart = Date.now();
  let _lastStage    = 'landing';

  function setStage(stage) { _lastStage = stage; }

  function _sessionDuration() {
    return Math.round((Date.now() - _sessionStart) / 1000);
  }

  // ── Init: wire beforeunload once ─────────────────────────
  function init() {
    _sessionStart = Date.now();
    window.addEventListener('beforeunload', () => {
      track('session_ended', {
        duration_seconds: _sessionDuration(),
        last_stage:       _lastStage,
      });
    });
    // pagehide fires on mobile where beforeunload may not
    window.addEventListener('pagehide', () => {
      track('session_ended', {
        duration_seconds: _sessionDuration(),
        last_stage:       _lastStage,
      });
    });
  }

  // ── Convenience helpers (named event wrappers) ─────────────
  function playerRegistered(faction, referralSource) {
    track('player_registered', {
      faction,
      source: referralSource || _getUtmSource() || 'direct',
    });
  }

  function puzzleProgress(puzzleId, completed, timeSeconds) {
    track('puzzle_progress', {
      puzzle_id:    String(puzzleId),
      completed:    Boolean(completed),
      time_seconds: timeSeconds || 0,
    });
  }

  function decisionMade(decisionType, properties = {}) {
    track('decision_made', {
      decision_type: decisionType,
      ...properties,
    });
  }

  function _getUtmSource() {
    try {
      return new URLSearchParams(window.location.search).get('utm_source') || '';
    } catch { return ''; }
  }

  return {
    init,
    track,
    setStage,
    playerRegistered,
    puzzleProgress,
    decisionMade,
  };

})();
