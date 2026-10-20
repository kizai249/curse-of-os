import { locationById } from '../config/locations';
import { cityById } from '../config/tournament';
import type { EventBus } from '../core/EventBus';
import type { Logger } from '../core/Logger';
import type { CollectOutcome, GameSession, SessionEvents } from '../game/GameSession';
import type { LoadStatus } from '../persistence/SaveManager';
import type { Settings } from '../persistence/saveSchema';
import { RARITY_COLORS, type ArenaCallbacks, type ArenaScene } from '../render/ArenaScene';
import type { LocationDefinition } from '../domain/types';
import { itemArt } from './art';
import type { ResultsParams, Screen, ScreenId, ScreenParams, UIContext } from './context';
import { clear, el, progressBar } from './dom';
import { fmt, KIND_LABEL, RARITY_LABEL } from './labels';
import { albumScreen } from './screens/album';
import { cityScreen } from './screens/city';
import { gamesScreen } from './screens/games';
import { mapScreen } from './screens/map';
import { missionsScreen } from './screens/missions';
import { partyScreen } from './screens/party';
import { profileScreen } from './screens/profile';
import { quizScreen } from './screens/quiz';
import { resultsScreen } from './screens/results';
import { settingsScreen } from './screens/settings';
import { squadScreen } from './screens/squad';
import { timingShotScreen } from './screens/timingShot';

const SCREENS: Readonly<Record<Exclude<ScreenId, 'arena'>, Screen>> = {
  map: mapScreen,
  city: cityScreen,
  missions: missionsScreen,
  album: albumScreen,
  games: gamesScreen,
  profile: profileScreen,
  settings: settingsScreen,
  timing_shot: timingShotScreen,
  cup_quiz: quizScreen,
  squad_builder: squadScreen,
  party_shootout: partyScreen,
  results: resultsScreen,
};

const NAV: readonly { id: ScreenId; label: string; icon: string }[] = [
  { id: 'map', label: 'الخريطة', icon: '🗺️' },
  { id: 'missions', label: 'المهمات', icon: '📋' },
  { id: 'album', label: 'الألبوم', icon: '📒' },
  { id: 'games', label: 'التحديات', icon: '🎯' },
  { id: 'profile', label: 'حسابي', icon: '👤' },
];

/** Which nav tab is highlighted for screens that are not tabs themselves. */
const NAV_PARENT: Partial<Record<ScreenId, ScreenId>> = {
  city: 'map', arena: 'map', settings: 'profile', results: 'games',
  timing_shot: 'games', cup_quiz: 'games', squad_builder: 'games', party_shootout: 'games',
};
const IMMERSIVE: ReadonlySet<ScreenId> = new Set(['timing_shot', 'cup_quiz', 'party_shootout']);
/** Screens that should refresh when the save changes while they are visible. */
const LIVE_SCREENS: ReadonlySet<ScreenId> = new Set(['missions', 'profile']);
const COOLDOWN_REFRESH_MS = 1000;

export type ArenaFactory = (location: LocationDefinition, callbacks: ArenaCallbacks, settings: Settings) => ArenaScene | null;

export interface UIDeps extends Omit<UIContext, 'navigate' | 'toast' | 'haptic' | 'perf' | 'finishRun'> {
  readonly bus: EventBus<SessionEvents>;
  readonly createArena: ArenaFactory;
  readonly webglSupported: boolean;
  readonly logger: Logger;
}

/**
 * Owns the DOM layer: bottom navigation, HUD over the 3D arena, overlay screens and toasts.
 * Also owns the lifetime of the single ArenaScene (one location loaded at a time).
 * Screens never talk to each other directly — only through navigate() and session events.
 */
export class UIController {
  private current: ScreenId = 'map';
  private cleanup: (() => void) | void = undefined;
  private nearestPoint: string | null = null;
  private collecting = false;
  private arena: ArenaScene | null = null;
  private readonly ctx: UIContext;
  private readonly session: GameSession;

  private readonly screenLayer = document.getElementById('screen-layer')!;
  private readonly hud = document.getElementById('hud')!;
  private readonly nav = document.getElementById('bottom-nav')!;
  private readonly toasts = document.getElementById('toasts')!;
  private readonly banner = document.getElementById('banner')!;
  private readonly arenaEl = document.getElementById('arena')!;

  private readonly levelEl = el('span', { class: 'hud-level' });
  private readonly xpBar = el('div', { class: 'hud-xp' });
  private readonly shardsEl = el('span', { class: 'chip chip-shard', dir: 'ltr' });
  private readonly placeEl = el('span', { class: 'hud-place' });
  private readonly offlineEl = el('span', { class: 'chip chip-offline', hidden: true }, 'أوفلاين — تقدمك محفوظ عندك');
  private readonly collectBtn = el('button', { class: 'btn btn-gold btn-xl collect-btn', type: 'button', hidden: true }, 'التقط! ✨');
  private readonly hint = el('p', { class: 'hud-hint' }, 'اضغط على الأرض عشان تمشي، وروح للنقاط اللامعة');

  constructor(private readonly deps: UIDeps) {
    this.session = deps.session;
    this.ctx = {
      session: deps.session, catalog: deps.catalog, missionBook: deps.missionBook, audio: deps.audio,
      analytics: deps.analytics, clock: deps.clock,
      navigate: (s, p) => this.navigate(s, p),
      toast: (t, k) => this.toast(t, k),
      haptic: (p) => this.haptic(p),
      perf: () => this.arena?.perf ?? null,
      finishRun: (r) => this.finishRun(r),
    };
  }

  mount(loadStatus: LoadStatus): void {
    this.buildNav();
    this.buildHud();
    this.bindSessionEvents();
    this.bindAppLifecycle();
    this.showLoadStatus(loadStatus);
    this.refreshHud();
    window.setInterval(() => {
      this.refreshPoints();
      this.session.refreshDaily(); // no-op unless local midnight has passed while the app is open
    }, COOLDOWN_REFRESH_MS);
    this.navigate('map');
  }

  navigate(screen: ScreenId, params?: ScreenParams): void {
    try {
      this.cleanup?.();
    } catch (err) {
      this.deps.logger.error('Screen cleanup failed', err);
    }
    this.cleanup = undefined;
    this.current = screen;
    clear(this.screenLayer);
    document.querySelectorAll('.sheet-overlay').forEach((n) => n.remove());

    const isArena = screen === 'arena';
    if (isArena && !this.enterLocation(params?.locationId ?? this.session.data.arena.lastLocationId)) {
      this.navigate('map');
      return;
    }
    this.screenLayer.hidden = isArena;
    this.hud.hidden = !isArena;
    this.nav.hidden = IMMERSIVE.has(screen);
    this.syncNav();
    // The 3D loop only runs while visible — overlay screens are opaque, so stop it to save battery.
    if (isArena && !document.hidden) this.arena?.start();
    else this.arena?.stop();
    if (isArena) return;

    const page = el('div', { class: 'screen', role: 'region', 'aria-label': screen });
    this.screenLayer.append(page);
    try {
      this.cleanup = SCREENS[screen](page, this.ctx, params);
    } catch (err) {
      this.deps.logger.error(`Screen "${screen}" failed to render`, err);
      clear(page);
      page.append(el('div', { class: 'empty-state' },
        el('div', { class: 'empty-icon' }, '⚠️'),
        el('h3', {}, 'صار خطأ في عرض الصفحة'),
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => this.navigate('map') }, 'رجوع للخريطة')));
    }
    this.screenLayer.scrollTop = 0;
  }

  toast(text: string, kind: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const t = el('div', { class: `toast toast-${kind}`, role: 'status' }, text);
    this.toasts.append(t);
    window.setTimeout(() => t.classList.add('hide'), 2600);
    window.setTimeout(() => t.remove(), 3100);
  }

  haptic(pattern: number | number[]): void {
    if (!this.session.data.settings.haptics) return;
    try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
  }

  applySettings(s: Settings): void {
    this.deps.audio.setVolumes(s.sfxVolume, s.musicVolume);
    this.arena?.setQuality(s.quality);
    this.arena?.setReducedMotion(s.reducedMotion);
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
  }

  // ── arena / locations ───────────────────────────────────────────────────

  /** Loads (or keeps) the 3D scene for a location. Returns false when it cannot be shown. */
  private enterLocation(locationId: string | undefined): boolean {
    const location = locationId ? locationById(locationId) : undefined;
    if (!location) return false;
    if (this.arena?.location.id === location.id) return true;
    if (!this.deps.webglSupported) {
      this.toast('جهازك ما يدعم الرسوم ثلاثية الأبعاد — جرّب Chrome محدّث', 'warn');
      return false;
    }
    this.arena?.dispose();
    this.arena = null;
    this.onNearestPointChange(null);
    clear(this.arenaEl);
    const arena = this.deps.createArena(location, { onNearestPointChange: (id) => this.onNearestPointChange(id) }, this.session.data.settings);
    if (!arena) {
      this.toast('ما قدرنا نحمّل المكان، جرّب مرة ثانية', 'error');
      return false;
    }
    this.arena = arena;
    this.applySettings(this.session.data.settings);
    this.session.setLastLocation(location.id);
    const city = cityById(location.cityId);
    this.placeEl.textContent = location.kind === 'stadium' ? `${location.nameAr} · ${city?.nameAr ?? ''}` : location.nameAr;
    this.refreshPoints();
    return true;
  }

  private refreshPoints(): void {
    if (!this.arena) return;
    for (const p of this.arena.location.points) this.arena.setPointAvailable(p.id, this.session.pointCooldownRemaining(p.id) === 0);
  }

  onNearestPointChange(pointId: string | null): void {
    this.nearestPoint = pointId;
    this.collectBtn.hidden = pointId === null;
    this.hint.hidden = pointId !== null;
  }

  private async collect(): Promise<void> {
    const pointId = this.nearestPoint;
    if (!pointId || this.collecting) return;
    this.collecting = true;
    this.collectBtn.setAttribute('disabled', '');
    this.deps.audio.unlock();
    try {
      const res = await this.session.collectDiscovery(pointId);
      if (!res.ok) {
        this.deps.audio.play('error');
        this.toast(res.error === 'cooldown' ? 'هالنقطة ترجع بعد شوي ⏳' : 'ما قدرنا نلتقطها، جرّب مرة ثانية', 'warn');
        return;
      }
      this.arena?.setPointAvailable(pointId, false);
      this.deps.audio.play('collect', res.value.item.rarity);
      this.haptic(res.value.item.rarity === 'legendary' ? [30, 60, 30, 60, 80] : 40);
      this.deps.analytics.track({ name: 'discovery_collected', props: { itemId: res.value.item.id, rarity: res.value.item.rarity, duplicate: res.value.duplicate } });
      await this.arena?.playCollect(pointId, res.value.item);
      this.showReveal(res.value);
    } finally {
      this.collecting = false;
      this.collectBtn.removeAttribute('disabled');
    }
  }

  private showReveal(o: CollectOutcome): void {
    const close = () => overlay.remove();
    const isLandmark = o.item.kind === 'landmark';
    const overlay = el('div', { class: 'sheet-overlay reveal' },
      el('div', { class: `sheet reveal-card rarity-${o.item.rarity}`, role: 'dialog', 'aria-modal': 'true', style: `--rarity:${RARITY_COLORS[o.item.rarity]}` },
        el('span', { class: 'rarity-pill' }, `${KIND_LABEL[o.item.kind]} · ${RARITY_LABEL[o.item.rarity]}`),
        itemArt(o.item, `item-art item-art-lg ${isLandmark ? 'postcard-lg' : ''}`),
        el('h2', {}, o.item.nameAr),
        el('p', { class: 'muted' }, o.item.descriptionAr),
        el('div', { class: 'chips center' },
          o.duplicate ? el('span', { class: 'chip chip-shard' }, 'مكررة ← ', el('bdi', { dir: 'ltr' }, `+${o.shardsAwarded} 💎`)) : el('span', { class: 'chip chip-gold' }, 'جديدة! ✨'),
          el('span', { class: 'chip chip-xp', dir: 'ltr' }, `+${o.xpAwarded} XP`)),
        el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, 'كفو 👌')));
    document.body.append(overlay);
    overlay.querySelector<HTMLButtonElement>('button')?.focus();
  }

  /** Records a finished mini-game run and opens the results screen. */
  private async finishRun(r: Omit<ResultsParams, 'xpAwarded' | 'newBest' | 'error'>): Promise<void> {
    const { result } = r;
    this.deps.analytics.track({ name: 'minigame_finished', props: { gameId: result.gameId, success: result.success, score: result.score, durationMs: result.durationMs } });
    const recorded = await this.session.recordMiniGame(result);
    const results: ResultsParams = recorded.ok
      ? { ...r, xpAwarded: recorded.value.xpAwarded, newBest: recorded.value.newBest }
      : { ...r, xpAwarded: 0, newBest: false, error: 'ما قدرنا نسجل النتيجة، المكافأة ما انضافت.' };
    this.navigate('results', { results });
  }

  // ── building blocks ─────────────────────────────────────────────────────

  private buildNav(): void {
    for (const item of NAV) {
      this.nav.append(el('button', { type: 'button', 'data-screen': item.id, onclick: () => { this.deps.audio.unlock(); this.deps.audio.play('tap'); this.navigate(item.id); } },
        el('span', { class: 'nav-icon', 'aria-hidden': 'true' }, item.icon), el('span', {}, item.label),
        item.id === 'missions' ? el('span', { class: 'nav-badge', hidden: true }) : null));
    }
  }

  private syncNav(): void {
    const tab = NAV_PARENT[this.current] ?? this.current;
    for (const b of Array.from(this.nav.querySelectorAll('button'))) {
      const active = b.dataset.screen === tab;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    const claimable = this.claimableCount();
    const badge = this.nav.querySelector<HTMLElement>('.nav-badge');
    if (badge) { badge.hidden = claimable === 0; badge.textContent = String(claimable); }
  }

  private buildHud(): void {
    const back = el('button', { class: 'hud-back', type: 'button', 'aria-label': 'رجوع للمدينة', onclick: () => {
      const cityId = this.arena?.location.cityId;
      this.navigate(cityId ? 'city' : 'map', cityId ? { cityId } : undefined);
    } }, '→ ', this.placeEl);
    this.hud.append(
      el('div', { class: 'hud-top' },
        el('button', { class: 'hud-profile', type: 'button', onclick: () => this.navigate('profile') }, this.levelEl, this.xpBar),
        el('div', { class: 'row' }, this.offlineEl, this.shardsEl)),
      el('div', { class: 'hud-place-row' }, back),
      el('div', { class: 'hud-bottom' }, this.hint, this.collectBtn));
    this.collectBtn.addEventListener('click', () => { void this.collect(); });
  }

  private refreshHud(): void {
    const lvl = this.session.levelInfo();
    this.levelEl.textContent = `Lv ${lvl.level}`;
    clear(this.xpBar);
    this.xpBar.append(progressBar(lvl.xpIntoLevel, lvl.isMaxLevel ? 1 : lvl.xpForNextLevel, 'progress-xp'));
    this.shardsEl.textContent = `${fmt(this.session.data.inventory.shards)} 💎`;
    this.syncNav();
  }

  private claimableCount(): number {
    const m = this.session.data.missions;
    return [...Object.values(m.intro), ...Object.values(m.daily.entries)].filter((p) => p.status === 'completed').length;
  }

  private bindSessionEvents(): void {
    const { bus } = this.deps;
    let lastSettings = this.session.data.settings;
    this.applySettings(lastSettings);
    bus.on('saveChanged', (data) => {
      if (data.settings !== lastSettings) {
        lastSettings = data.settings;
        this.applySettings(data.settings);
      }
      this.refreshHud();
      if (LIVE_SCREENS.has(this.current)) this.navigate(this.current);
    });
    bus.on('levelUp', ({ level }) => {
      this.deps.audio.play('levelUp');
      this.haptic([40, 40, 80]);
      this.toast(`لفل أب! وصلت المستوى ${level} 🚀`, 'success');
      this.deps.analytics.track({ name: 'level_up', props: { level } });
    });
    bus.on('missionCompleted', ({ missionId }) => {
      const def = this.deps.missionBook.get(missionId);
      this.toast(`خلصت مهمة «${def?.titleAr ?? missionId}» — روح استلم 🎁`, 'success');
    });
    bus.on('dailyExpired', ({ missionIds }) => this.toast(`انتهت ${missionIds.length} مهمات من أمس. عندك مهمات جديدة اليوم!`, 'info'));
    bus.on('saveFailed', () => this.showBanner('ما قدرنا نحفظ تقدمك (المساحة ممتلئة؟). اللعب مستمر بس ممكن يضيع التقدم.', 'warn'));
  }

  private bindAppLifecycle(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.arena?.stop();
        this.deps.audio.suspend();
      } else {
        this.deps.audio.resume();
        this.session.refreshDaily();
        this.refreshPoints();
        if (this.current === 'arena') this.arena?.start();
      }
    });
    const syncOnline = () => { this.offlineEl.hidden = navigator.onLine; };
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    syncOnline();
    window.addEventListener('pointerdown', () => this.deps.audio.unlock(), { once: true });
  }

  private showLoadStatus(status: LoadStatus): void {
    switch (status) {
      case 'new': this.toast('هلا والله! حسابك جاهز — يلا على درب الكأس 🏆', 'success'); break;
      case 'migrated': this.toast('حدّثنا اللعبة لنسخة البطولة! قطعك القديمة تحولت شظايا 💎', 'info'); break;
      case 'recovered': this.showBanner('ملف الحفظ كان تالف، فبدينا من جديد. حفظنا نسخة احتياطية من الملف القديم.', 'warn'); break;
      case 'incompatible': this.showBanner('حفظك من نسخة أحدث من اللعبة. حدّث اللعبة — التقدم الحالي ما راح ينحفظ.', 'error'); break;
      case 'unavailable': this.showBanner('التخزين مقفل في المتصفح (وضع خاص؟). تقدر تلعب بس التقدم ما راح ينحفظ.', 'warn'); break;
      case 'loaded': break;
    }
  }

  private showBanner(text: string, kind: 'warn' | 'error'): void {
    clear(this.banner);
    this.banner.className = `banner banner-${kind}`;
    this.banner.append(el('span', {}, text), el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'إغلاق', onclick: () => { this.banner.hidden = true; } }, '✕'));
    this.banner.hidden = false;
  }
}
