import './ui/styles.css';
import { ARENA_POINTS } from './config/arena';
import { ITEM_CATALOG } from './config/items';
import { DAILY_MISSION_POOL, INTRO_MISSIONS } from './config/missions';
import { systemClock } from './core/Clock';
import { EventBus } from './core/EventBus';
import { consoleSink, createLogger } from './core/Logger';
import { mathRng } from './core/Rng';
import { ItemCatalog } from './domain/catalog';
import { MissionBook } from './domain/missions';
import { GameSession, type SessionEvents } from './game/GameSession';
import { createNewSave } from './game/newSave';
import { SaveManager, type KeyValueStore } from './persistence/SaveManager';
import type { Settings } from './persistence/saveSchema';
import { ArenaScene } from './render/ArenaScene';
import { generateThumbnails } from './render/ItemThumbnails';
import { LocalAnalytics } from './services/Analytics';
import { AudioService } from './services/AudioService';
import { LocalRewardAuthority } from './services/RewardAuthority';
import { UIController } from './ui/UIController';

const logger = createLogger('fq', consoleSink, import.meta.env.DEV ? 'debug' : 'info');

/** localStorage access itself can throw (Safari private mode, blocked cookies). */
function resolveStorage(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => { throw new Error('storage blocked'); }, setItem: () => { throw new Error('storage blocked'); }, removeItem: () => undefined };
  }
}

function showFatal(err: unknown): void {
  logger.error('Fatal boot error', err);
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.classList.add('error');
  const msg = loading.querySelector('.loading-text');
  if (msg) msg.textContent = 'صار خطأ وقت التشغيل 😓';
  const retry = document.createElement('button');
  retry.className = 'btn btn-gold';
  retry.type = 'button';
  retry.textContent = 'جرّب مرة ثانية';
  retry.addEventListener('click', () => window.location.reload());
  loading.append(retry);
}

function boot(): void {
  const clock = systemClock;
  const catalog = new ItemCatalog(ITEM_CATALOG);
  const missionBook = new MissionBook(INTRO_MISSIONS, DAILY_MISSION_POOL);
  const bus = new EventBus<SessionEvents>(logger.child('bus'));
  const analytics = new LocalAnalytics(logger.child('analytics'));
  const audio = new AudioService(logger.child('audio'));
  const saveManager = new SaveManager(resolveStorage(), () => createNewSave(missionBook, clock), clock, logger.child('save'));
  const loaded = saveManager.load();
  logger.info(`Save ${loaded.status}`);

  const session = new GameSession({
    saveManager, catalog, missionBook, points: ARENA_POINTS,
    authority: new LocalRewardAuthority((id) => catalog.get(id) !== undefined),
    clock, rng: mathRng, logger: logger.child('session'), bus,
  }, loaded.data);
  session.refreshDaily();

  let arena: ArenaScene | null = null;
  let ui: UIController | null = null;
  const arenaEl = document.getElementById('arena')!;
  if (ArenaScene.isSupported()) {
    try {
      arena = new ArenaScene(arenaEl, ARENA_POINTS, { onNearestPointChange: (id) => ui?.onNearestPointChange(id) }, logger.child('arena'), session.data.settings.quality);
    } catch (err) {
      logger.error('Arena failed to initialise', err);
      arena = null;
    }
  }
  const thumbnails = arena ? generateThumbnails(ITEM_CATALOG, logger.child('thumbs')) : new Map<string, string>();

  const applySettings = (s: Settings) => {
    audio.setVolumes(s.sfxVolume, s.musicVolume);
    arena?.setQuality(s.quality);
    arena?.setReducedMotion(s.reducedMotion);
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
  };
  let lastSettings = session.data.settings;
  applySettings(lastSettings);
  bus.on('saveChanged', (data) => {
    if (data.settings !== lastSettings) {
      lastSettings = data.settings;
      applySettings(data.settings);
    }
  });

  ui = new UIController({ session, catalog, missionBook, audio, analytics, clock, thumbnails, bus, arena, logger: logger.child('ui') });
  ui.mount(loaded.status);
  analytics.track({ name: 'session_start', props: { loadStatus: loaded.status } });

  window.addEventListener('error', (e) => { logger.error('Uncaught error', e.error ?? e.message); analytics.track({ name: 'error', props: { message: String(e.message) } }); });
  window.addEventListener('unhandledrejection', (e) => { logger.error('Unhandled rejection', e.reason); analytics.track({ name: 'error', props: { message: String(e.reason) } }); });

  document.getElementById('loading')?.classList.add('done');
  window.setTimeout(() => document.getElementById('loading')?.remove(), 600);
}

try {
  boot();
} catch (err) {
  showFatal(err);
}
