/* ══════════════════════════════════════════════════════════════
   storage.js — localStorage persistence layer
═══════════════════════════════════════════════════════════════ */

const Storage = (() => {
  const KEYS = {
    PLAYER:  'cos_player',
    VERSION: 'cos_version',
  };

  const CURRENT_VERSION = '2.0.0';

  function _migrate(raw) {
    if (!raw || raw.version === CURRENT_VERSION) return raw;
    // Future migrations go here
    raw.version = CURRENT_VERSION;
    return raw;
  }

  function loadPlayer() {
    try {
      const raw = localStorage.getItem(KEYS.PLAYER);
      if (!raw) return null;
      return _migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('[Storage] Failed to load player:', e);
      return null;
    }
  }

  function savePlayer(player) {
    try {
      localStorage.setItem(KEYS.PLAYER, JSON.stringify(player));
    } catch (e) {
      console.warn('[Storage] Failed to save player:', e);
    }
  }

  function clearPlayer() {
    localStorage.removeItem(KEYS.PLAYER);
  }

  function getRef() {
    return sessionStorage.getItem('cos_ref') || null;
  }

  function setRef(code) {
    sessionStorage.setItem('cos_ref', code);
  }

  function clearRef() {
    sessionStorage.removeItem('cos_ref');
  }

  return { loadPlayer, savePlayer, clearPlayer, getRef, setRef, clearRef };
})();
