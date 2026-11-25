/*
 * USER-X digital business card — EVERYTHING you may want to edit lives here.
 *
 *  - Empty strings ('') mean "not confirmed yet": the matching button is hidden and the
 *    contact file leaves the field out. Nothing is ever invented.
 *  - After you deploy, put the public address in `cardUrl`, run `npm run build` (contact file)
 *    and `npm run qr` (QR code files). See README.md.
 *  - This file is loaded by the page (window.CARD_CONFIG) and by the build tools (Node).
 */
(function (root) {
  'use strict';
  var CARD_CONFIG = {
    // ---- Who ------------------------------------------------------------
    person: {
      nameAr: 'خالد حميدة',
      nameEn: 'Khalid Hamida',
      firstEn: 'Khalid',
      lastEn: 'Hamida',
      titleAr: 'شريك مؤسس ومدير العمليات',
      titleEn: 'Co-Founder & Operation Manager',
      // Short intro shown on the card. Edit freely.
      introAr: 'أدير العمليات في يوزر إكس — من أول فكرة لين ما تشتغل التجربة على الأرض واللاعبين داخلها.',
      introEn: 'I run operations at USER-X — from the first idea to the moment the experience is live and the players are in it.'
    },
    company: {
      name: 'USER-X',
      nameAr: 'يوزر إكس',
      taglineAr: 'كل لاعب هو نقطة التقاطع',
      taglineEn: 'Every user is the X',
      aboutAr: 'شركة ترفيه تفاعلي في جدة. نصمّم ونشغّل تجارب وألعاب هجينة للشلّة والعلامات والفعاليات — ما تتفرّج، إنت اللعبة.',
      aboutEn: 'An interactive entertainment company in Jeddah. We design and run hybrid games and experiences for friends, brands and events — you don’t watch, you play.',
      cityAr: 'جدة، المملكة العربية السعودية',
      cityEn: 'Jeddah, Saudi Arabia',
      city: 'Jeddah',
      country: 'Saudi Arabia'
    },

    // ---- Contact (verified values only) ---------------------------------
    contact: {
      // USER-X team line — verified in the USER-X project files (website contact config).
      companyPhone: '+966565952065',
      companyWhatsapp: '966565952065',   // digits only, no plus sign (wa.me format)
      // Khalid's personal details — NOT found in the project files. Fill them when confirmed.
      personalPhone: '',                 // e.g. '+9665XXXXXXXX'
      personalWhatsapp: '',              // e.g. '9665XXXXXXXX' (digits only). Empty → the USER-X line is used.
      email: '',                         // e.g. 'khalid@your-domain.sa'
      linkedin: '',                      // e.g. 'https://www.linkedin.com/in/…'
      website: ''                        // e.g. 'https://user-x.sa'
    },
    whatsappMessageAr: 'هلا خالد، أخذت رقمك من بطاقة يوزر إكس الرقمية 👋',
    whatsappMessageEn: 'Hi Khalid, I got your details from your USER-X digital card 👋',

    // ---- Where the card lives -------------------------------------------
    // The public HTTPS address of the deployed card. The QR code points here.
    // Leave empty until deployed: the page then shows its own address in the QR panel,
    // with a warning when that address is a local/preview one.
    cardUrl: '',
    vcfFile: 'contact/khalid-hamida-userx.vcf', // written by `npm run build`

    // ---- Experience -----------------------------------------------------
    defaultLang: 'ar',          // 'ar' or 'en'. ?lang=en in the URL overrides it (handy for a second QR).
    soundDefault: false,        // sound is opt-in, never autoplays
    introAutoContinueMs: 5200,  // the intro moves on by itself after this (0 = wait for a tap)
    game: {
      durationMs: 12000,
      countdownFrom: 3,
      // score tiers (inclusive lower bounds) — tuned by playing tests, see docs/TESTING_REPORT.md
      tiers: [0, 70, 140, 210],
      goldCardScore: 210          // reaching this unlocks the gold card skin
    },
    secretTaps: 5,                // taps on the card logo that open the secret level

    // ---- Analytics (optional, anonymous) --------------------------------
    // Empty → nothing leaves the browser. Set an HTTPS endpoint that accepts
    // POST JSON {event, props, lang, ts} to collect anonymous counts. See docs/DEPLOYMENT.md.
    analytics: { endpoint: '' }
  };

  root.CARD_CONFIG = CARD_CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CARD_CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
