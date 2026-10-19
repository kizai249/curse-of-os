import type { QualityLevel, Settings } from '../../persistence/saveSchema';
import type { Screen } from '../context';
import { el } from '../dom';

const QUALITY_LABEL: Record<QualityLevel, string> = { low: 'توفير البطارية', medium: 'متوسط', high: 'عالي' };

export const settingsScreen: Screen = (root, ctx) => {
  const s = ctx.session.data.settings;
  const update = (patch: Partial<Settings>) => ctx.session.updateSettings(patch);

  const slider = (label: string, key: 'musicVolume' | 'sfxVolume') => {
    const id = `set-${key}`;
    const input = el('input', { id, type: 'range', min: 0, max: 100, step: 5, value: Math.round(s[key] * 100) });
    input.addEventListener('change', () => { update({ [key]: Number(input.value) / 100 }); ctx.audio.play('tap'); });
    return el('div', { class: 'setting' }, el('label', { for: id }, label), input);
  };
  const toggle = (label: string, key: 'reducedMotion' | 'haptics', hint?: string) => {
    const id = `set-${key}`;
    const input = el('input', { id, type: 'checkbox', class: 'switch', checked: s[key] });
    input.addEventListener('change', () => update({ [key]: input.checked }));
    return el('div', { class: 'setting setting-row' }, el('label', { for: id }, label, hint ? el('small', { class: 'muted block' }, hint) : null), input);
  };
  const quality = el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'جودة الرسوم' });
  for (const q of ['low', 'medium', 'high'] as const) {
    const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(s.quality === q), class: s.quality === q ? 'active' : '' }, QUALITY_LABEL[q]);
    b.addEventListener('click', () => {
      update({ quality: q });
      for (const child of Array.from(quality.children)) { child.classList.remove('active'); child.setAttribute('aria-checked', 'false'); }
      b.classList.add('active');
      b.setAttribute('aria-checked', 'true');
    });
    quality.append(b);
  }

  const perfLine = el('p', { class: 'muted small mono', dir: 'ltr' }, '—');
  const perf = ctx.perf();
  const refreshPerf = () => {
    if (!perf) { perfLine.textContent = 'Renderer unavailable'; return; }
    const mem = perf.memoryMb();
    perfLine.textContent = `FPS ${perf.fps.toFixed(0)} · worst frame ${perf.worstFrameMs.toFixed(0)} ms${mem !== null ? ` · heap ${mem.toFixed(0)} MB` : ''}`;
  };
  refreshPerf();
  const timer = window.setInterval(refreshPerf, 1000);

  root.append(
    el('header', { class: 'screen-header' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'رجوع', onclick: () => ctx.navigate('profile') }, '→'),
      el('h2', {}, 'الإعدادات')),
    el('section', { class: 'card stack' },
      el('h3', {}, 'الصوت'), slider('الأجواء (الجمهور)', 'musicVolume'), slider('المؤثرات', 'sfxVolume')),
    el('section', { class: 'card stack' },
      el('h3', {}, 'العرض والوصول'),
      el('div', { class: 'setting' }, el('span', {}, 'جودة الرسوم'), quality),
      toggle('تقليل الحركة', 'reducedMotion', 'يخفف الاهتزاز والمؤثرات والانتقالات'),
      toggle('الاهتزاز', 'haptics')),
    el('section', { class: 'card stack' },
      el('h3', {}, 'الأداء (للمطورين)'), perfLine,
      el('p', { class: 'muted small' }, `نسخة 0.1.0 · وضع محلي بدون سيرفر`)),
  );
  return () => window.clearInterval(timer);
};
