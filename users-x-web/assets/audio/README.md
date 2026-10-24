# assets/audio

Empty on purpose. Every sound in the experience is synthesised live with the Web Audio API
(original cues, no licensing needed) and only starts after the visitor turns sound on.

To use recorded audio instead, drop original or licensed files here and map them in
`window.USERSX_CONFIG.audio` in `index.html`, e.g. `intro: 'assets/audio/intro.mp3'`.
Cue names: blip, select, reveal, back, avatar, intro, portal, horror, mystery, strategy,
sports, adventure, outroPulse, outroFinal, win, lose.
A missing or broken file is logged once and that cue falls back to the synth.
