# IMPLEMENTATION_PLAN — خطة التنفيذ

**الإصدار:** v1.0 — 21 أكتوبر 2026
**يعتمد على:** كل وثائق `docs/` v1.0 (المرجع عند التعارض: `PRODUCT_BRIEF.md` ثم `MVP_SCOPE.md`)
**الفريق:** مطوّر واحد (Solo). الجهد بأيام العمل، ومجموعه مطابق لـ `MVP_SCOPE.md` §4 (66 يومًا).

---

## 1. مكان المشروع داخل المستودع

المستودع `curse-of-os` فيه موقع «لعنة أوس» في الجذر (`index.html`، و`hub.html`، و`js/`، و`css/`). **ما لمسنا أي ملف منه.** Football Quest يعيش في مجلدات مستقلة:

| المسار | المحتوى |
|---|---|
| `docs/` | وثائق المنتج (هذا الملف، و`RUNBOOK.md`، و`design/`) |
| `unity/FootballQuest/` | مشروع Unity (العميل) |
| `firebase/` | `firebase.json`، والقواعد، والفهارس، و`functions/` (TypeScript) |
| `admin-web/` | لوحة الشركاء (Slice 9) |
| `shared/contracts/` | متجهات اختبار مشتركة بين C# وTypeScript |
| `tools/` | `core-tests/` (اختبارات C# بـ dotnet بدون Unity)، و`unity-meta.py` |
| `.github/workflows/fq-*.yml` | CI خاص بالمشروع، ويشتغل فقط عند تغيّر مساراته |

> TODO(owner): إذا قررت نقل Football Quest لمستودع مستقل، النقل `git mv` للمجلدات أعلاه بدون أي تعديل في الكود.

## 2. ترتيب الشرائح

الترتيب يتبع الإصدارات في `PRODUCT_BRIEF.md` ت1: كل R1 أولًا (رفع 26 ديسمبر)، ثم R2 (12 يناير)، ثم R3 (24 يناير). كل ميزة من إصدار لاحق مخفية بمفتاح Remote Config قيمته `false` لين يجي إصدارها.

**الحالة:** ⬜ لم تبدأ · 🟨 جارية · ✅ منجزة (كود + اختبارات + commit) · ⚠️ منجزة وتنتظر تحققًا خارجيًا

| # | الشريحة | الإصدار | الجهد | الحالة | المراجع | اختبارات القبول |
|---|---|---|---|---|---|---|
| S1 | هيكل المشروع + CI + URP + هيكل Firebase (قواعد deny-all، والمحاكي، و`health`) | R1 | 3 | ⚠️ | ARCHITECTURE §2، §4، §9 | — |
| S2 | نظام واجهة RTL والتوطين (ع/En)، والإفصاح، وبوابة العمر والمدينة، وAuth (ضيف ثم ربط Apple/Google)، وحذف الحساب، والأذونات بحالاتها، والحالات العامة (`NET_OFFLINE`، و`FORCE_UPDATE`، و`APP_INTEGRITY`) | R1 | 6 | ⬜ | GAME_RULES §9.4–9.5، PERMISSION_AND_ERROR_STATES §1، §6، §7 | AT-01 (جزء الإذن)، AT-11 |
| S3 | خارطة الملاعب: 3 لوحات مدن، و8 محطات من عُدّة ملعب واحدة (ScriptableObject لكل محطة)، والمحتوى من `content/*` و`matchResults`، ومفاتيح Remote Config | R1 | 7 | ⬜ | GAME_RULES §2، ARCHITECTURE §3، §7 | AT-09 (جزء) |
| S4 | اقتصاد الخادم: `bootstrap` (الدخول اليومي)، و`stadiumVisit`، و`openPack` (الاحتمالات، ووزن يوم المباراة، وحماية سوء الحظ، والمكرر ← FP)، و`exchangeFanPoints`، وإنجازات المجموعة، وXP والحد اليومي والمستويات | R1 | 3 | ⬜ | GAME_RULES §3، §9.1–9.2، §10 | — |
| S5 | واجهة التجميع: ألبوم 24 × 4، وفتح الحزم، وعرض الاحتمالات المعلنة، والاستبدال | R1 | 2 | ⬜ | GAME_RULES §3 | AT-11 (احتمالات معلنة) |
| S6 | الموقع (Foreground): إضافة Native لـ iOS/Android، و`verifyPresence`، ونقاط القرب، وبطاقة «أنت قريب من فرع» | R1 | 4 | ⬜ | GAME_RULES §6.1–6.2، ARCHITECTURE §2.1 | AT-01، AT-02، AT-10 |
| S7 | رمز الفرع اليومي (`rotateBranchCodes`، و`scanBranchCode`)، والحملات والمخزون، والقسائم (`verified_visit`، و`invoice_code`)، و`redeemCoupon` الذري، والمحفظة، و`expireCoupons` | R1 | 9 | ⬜ | GAME_RULES §6.3، §8، ARCHITECTURE §6، DATA_CONTRACTS §4–5 | AT-03، AT-04، AT-05 |
| S9 | لوحة الشركاء (ويب): الحملات، والفروع، والمناطق، وشاشة الفرع، ووضع الموظف، والتقارير المجمعة + `logEvents` و`aggregateDaily` | R1 | 7 | ⬜ | ARCHITECTURE §8، §10، DATA_CONTRACTS §8–9 | AT-04، AT-10 |
| S10a | تجهيز R1: الأداء (إقلاع < 5 ث)، والبطارية، وCrashlytics، وتوقيع ورفع TestFlight/Play Internal، وقائمة المتاجر | R1 | 4 | ⬜ | ARCHITECTURE §2.2، RIGHTS_REGISTER §5 | AT-09، AT-10، AT-11 |
| | **مجموع R1** | | **45** | | | |
| S5b | بطاقات اللاعبين الافتراضية (30) | R2 | 2 | ⬜ | GAME_RULES §4 | — |
| S6b | سلسلة الزيارات وقسائم `visit_streak` | R2 | 1 | ⬜ | GAME_RULES §6.4 | — |
| S8 | «منتخبنا يجمعنا — الخطة الموزعة»: الغرف برمز، والحجز الجماعي، وتوزيع الألغاز، والنبض، وانتقال المضيف، و`closeRound` بـ Cloud Tasks | R2 | 9 | ⬜ | GAME_RULES §7، §8.4، DATA_CONTRACTS §6 | AT-06، AT-07، AT-08 |
| | **مجموع R2** | | **12** | | | |
| S5c | «حروف المنتخب» | R3 | 4 | ⬜ | GAME_RULES §5 | AT-11 (التشكيل) |
| S4b | المستويات ولوحة المتصدرين الأسبوعية (`weeklyLeaderboard`) | R3 | 3 | ⬜ | GAME_RULES §9.3 | — |
| S10c | اختبار R3 ورفعه | R3 | 2 | ⬜ | — | كل AT |
| | **مجموع R3** | | **9** | | | |
| | **المجموع** | | **66** | | | |

**على الحد** (`PRODUCT_BRIEF.md` ت1): إذا تأخر R1، تُقلّص S9 إلى «شاشة الفرع» و«وضع الموظف» فقط، وموعد الرفع ما يتأجل.

## 3. ما تحتويه كل شريحة (تعريف «منجزة»)

1. كود العميل و/أو الخادم.
2. اختبارات: وحدات لكل منطق نقي (C# في `FootballQuest.Core` يُختبر بـ dotnet وUnity، وTypeScript بـ vitest)، واختبارات Emulator لكل Cloud Function وكل توسعة في `firestore.rules`.
3. اختبار ذرية وتزامن لأي دالة تمس رصيدًا أو مخزونًا (طلبات متوازية على المحاكي + فحص الثوابت).
4. تحديث هذا الملف (الحالة + الملاحظات) و`RUNBOOK.md`.
5. commit مستقل للشريحة.

## 4. قرارات مأخوذة من الوثائق بدل البرومبت الأصلي

| البرومبت | الوثائق (المعتمد) | المرجع |
|---|---|---|
| «اقتصاد FootCoins» | العملة الوحيدة «نقاط المشجع» (FP)، مع XP والحزم | GAME_RULES §1 |
| «بيانات الملاعب من Remote Config» | المحتوى في Firestore `content/stadiums`، وRemote Config للنصوص الموسمية ومفاتيح الميزات فقط | DATA_CONTRACTS §8، ARCHITECTURE §7 |
| «Web Admin عبر Firestore Rules محصنة» | اللوحة تقرأ وتكتب عبر Callable Functions فقط، وما لها أي وصول مباشر لـ Firestore | ARCHITECTURE §8 |
| ترتيب الشرائح 1→10 | الترتيب حسب R1/R2/R3 | PRODUCT_BRIEF ت1 |
| «إذن الموقع بحالاته الثلاث» | أربع حالات: ممنوح، و`LOC_DENIED`، و`LOC_RESTRICTED`، و`LOC_APPROX_ONLY` | PERMISSION_AND_ERROR_STATES §1.4 |
| «Auth (Anonymous + ربط لاحق)» | ضيف + Apple + Google، وبوابة العمر، وحذف الحساب، كلها في R1 | MVP_SCOPE §3 |

## 5. أسئلة مفتوحة (TODO)

| # | السؤال | يوقف | الافتراض الحالي |
|---|---|---|---|
| Q1 | نسخة Unity LTS بالضبط («أحدث LTS عند بداية التطوير») | S1 (تحقق CI) | `6000.0.58f1`، وتتحدث تلقائيًا أول ما تفتح المشروع بنسختك ثم تسوي commit لـ `ProjectVersion.txt` |
| Q2 | معرّف الحزمة (Bundle ID) | S2 (تطبيقات Firebase) | `com.usersx.footballquest` |
| Q3 | نص الإفصاح: `PRODUCT_BRIEF.md` §7 (أقصر) أو `RIGHTS_REGISTER.md` §4 (فيه «أو منظم للبطولة» وجملة الأسماء) | S2 | نص RIGHTS_REGISTER §4 لأنه موصوف «النص المعتمد» ويشمل الأقصر. يُقدَّم عبر `disclaimer_text` فيتعدل بدون إصدار |
| Q4 | الخط العربي (OFL) | S2 | IBM Plex Sans Arabic، أو Tajawal (خط «لعنة أوس» الحالي) |
| Q5 | توفر Cloud Tasks وCloud Scheduler في `me-central2` | S7، S8 | يُتحقق عند إنشاء `fq-dev`. البديل المؤقت المقترح Scheduler كل دقيقة لإغلاق الجولات المنتهية |
| Q6 | Crashlytics في Unity: نتأكد إن الحزمة ما تسحب Firebase Analytics (AT-10 يمنع GA) | S10a | ما نضمّن `FirebaseAnalytics` أبدًا، ونفحص الحزم في AT-10 |
| Q7 | طريقة توزيع Firebase Unity SDK (حزم `.tgz`) | S2 | داخل `unity/FootballQuest/Packages/` عبر Git LFS |

## 6. سجل الشرائح

### S1 — هيكل المشروع + CI + URP ⚠️

**المنجز:**
- مشروع Unity في `unity/FootballQuest`: URP و`asmdef` لأربع طبقات (`Core` بدون UnityEngine، و`App`، و`Editor`، و`Tests.EditMode`)، والمشاهد الثلاثة (Boot، وHub، وStadium).
- `ProjectSetup` يطبّق الإعدادات برمجيًا: PlayerSettings للمنصتين (IL2CPP، وARM64، وAndroid API 24+، وiOS 15+، وLinear)، وأصل URP للجوال (بدون HDR، وظل واحد بتتالٍ واحد، وبدون أضواء إضافية)، وBuild Settings.
- `BuildScript` لـ GameCI.
- `GameDay` (يوم اللعبة يبدأ 04:00 الرياض) بنسختين C# وTS، ومتجهات مشتركة في `shared/contracts/`.
- Firebase: `firebase.json` (المنطقة `me-central2`)، و`firestore.rules` (قراءة المحتوى العام وملف المالك فقط، والباقي ممنوع)، ودالة بنية تحتية `health` مع Auth وApp Check.
- CI: `fq-backend.yml` و`fq-unity.yml`.

**الاختبارات:**
- `tools/core-tests` (dotnet): 6 ✅
- `firebase/functions` وحدات: 10 ✅
- Emulator (القواعد + `health`): 8 ✅
- `ProjectSetupTests` (EditMode): 4، تشتغل في CI فقط.

**ينتظر:** التحقق من EditMode وبناء Android وiOS في CI، وهذا يحتاج أسرار `UNITY_LICENSE` و`UNITY_EMAIL` و`UNITY_PASSWORD` (RUNBOOK §5). ولين تنضاف الأسرار، المهام تتخطى نفسها مع تحذير وما تفشل.

**ملاحظة:** `health` دالة بنية تحتية ما هي في قائمة ARCHITECTURE §5. ترجع وقت الخادم ويوم اللعبة، ويستخدمها العميل لمزامنة الساعة.
