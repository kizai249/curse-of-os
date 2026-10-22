# RUNBOOK — دليل البناء والتشغيل والنشر

**آخر تحديث:** Slice 9 — 21 أكتوبر 2026
الأقسام المعلّمة «(Slice N)» تُستكمل عند تنفيذ تلك الشريحة.

---

## 1. المتطلبات

| الأداة | النسخة | لماذا |
|---|---|---|
| Unity Hub + Editor | من `unity/FootballQuest/ProjectSettings/ProjectVersion.txt`، مع وحدتي Android Build Support وiOS Build Support | العميل |
| Node.js | 22 | Cloud Functions و`firebase-tools` |
| Java (JDK) | 21 | محاكي Firestore |
| .NET SDK | 8 | اختبارات `Core` السريعة بدون Unity (اختياري محليًا) |
| Xcode | آخر نسخة مستقرة (macOS فقط) | توقيع ورفع iOS (Slice 10a) |
| Python | 3 | `tools/unity-meta.py` |

`firebase-tools` مثبتة كـ devDependency، فما تحتاج تثبيتها عالميًا: `npx firebase ...` داخل `firebase/functions`.

## 2. الهيكل

راجع `docs/IMPLEMENTATION_PLAN.md` §1.

## 3. التشغيل محليًا

### 3.1 الخلفية (بدون أي مشروع Firebase حقيقي)

```bash
cd firebase/functions
npm ci
npm run lint
npm run typecheck
npm test                 # اختبارات الوحدات
npm run test:emulator    # يبني، ثم يشغّل Auth + Firestore + Functions emulators، ويختبر القواعد والدوال
npm run check            # كل اللي فوق بالترتيب
```

- المحاكي يستخدم المشروع `demo-fq`. البادئة `demo-` تضمن إنه ما يتصل بأي خدمة حقيقية.
- المنافذ في `firebase/firebase.json`: Auth 9099، وFirestore 8080، وFunctions 5001.
- لتشغيل المحاكي يدويًا والتجربة من Unity:
  ```bash
  cd firebase/functions && npm run build && npx firebase --config ../firebase.json emulators:start --project demo-fq --only auth,firestore,functions
  ```

### 3.1.1 المحتوى العام (المنتخبات، والملاعب، والجدول)

```bash
cd firebase/functions
# المحاكي شغّال (الأمر اليدوي في §3.1):
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:content -- --project demo-fq --dev-sample-match
# مشروع حقيقي (بصلاحيات gcloud auth application-default login):
npm run seed:content -- --project fq-dev
```

- المصدر الوحيد للمحتوى: `shared/contracts/content/*.json`. أي تعديل يبدأ هناك، وبعدها حدّث `EmbeddedContent.cs` (اختبار `ContentTests` يكشف أي اختلاف).
- `content/schedule` يُبنى تلقائيًا من `matchResults` عبر `onMatchResultWritten`.

### 3.1.2 مناطق الملاعب والفروع (للتطوير)

```bash
cd firebase/functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run zone:add -- --project demo-fq --type stadium --ref STD_RUH_KFS --lat <lat> --lng <lng> --radius 2000
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run zone:add -- --project demo-fq --type branch --ref br_demo --lat <lat> --lng <lng> --brand brand_demo --name "فرع تجريبي" --city JED
```

- الإحداثيات الحقيقية للملاعب والفروع تُدخل من لوحة الشركاء (S9). وما نخزن أي إحداثيات للاعبين (DATA_CONTRACTS §0).
- **Editor:** اضبط PlayerPrefs ‏`fq.editor_location` على `lat,lng,accuracy` (أضف `,mock` لتجربة `LOC_MOCK`)، و`fq.editor_perm.Location` على `1`.

### 3.1.3 حسابات الموظفين (لوحة الشركاء)

الأدوار مطالبات مخصصة (ARCHITECTURE §8). حتى تجهز اللوحة (S9) تُضبط من Admin SDK:

```js
await getAuth().setCustomUserClaims(uid, { role: "branch_staff", branchId: "br_x", brandId: "brand_y" });
// أو { role: "partner_admin", brandId } أو { role: "usersx_admin" }
```

### 3.1.4 لوحة الشركاء (`admin-web/`)

```bash
cd admin-web
npm ci
cp .env.example .env.local        # إعداد مشروع Firebase للوحة (مستثنى من git)
npm run dev                       # http://localhost:5173
npm test && npm run build         # وحدات + بناء dist/
npm run e2e                       # يبني الدوال واللوحة، ويشغّل Emulator Suite، ويقود Chromium (Playwright)
```

- **مع المحاكي:** `VITE_USE_EMULATOR=true` في `.env.local`، والمحاكي شغّال (§3.1).
- **الدخول:** أول حساب `usersx_admin` يُنشأ بـ Admin SDK (§3.1.3)، وبعدها من صفحة «الحسابات».
- **الصفحات حسب الدور:**
  - الموظف: شاشة الفرع ووضع الموظف.
  - الشريك: + الحملات والفروع والتقارير والحسابات.
  - usersx_admin: + المباريات والعلامات.

### 3.2 منطق C# بدون Unity

```bash
dotnet test tools/core-tests/CoreTests.csproj
```

يبني `Assets/_Project/Scripts/Core` واختباراته في `Tests/EditMode/Core`، وهي نفس الملفات اللي يبنيها Unity.

### 3.3 Unity

1. افتح `unity/FootballQuest` من Unity Hub.
2. أول مرة فقط: **Football Quest ▸ Apply Project Setup** (مرتين في أول مرة: الأولى تستورد TMP Essentials، والثانية تنشئ Font Assets). هذا:
   - ينشئ أصل URP في `Assets/_Project/Settings/`.
   - يضبط PlayerSettings وBuild Settings.
   - يستورد `Assets/TextMesh Pro/`.
   - ينشئ `Resources/Fonts/*SDF.asset`.

   بعدها سوّ commit للملفات الناتجة: `Assets/_Project/Settings/*`، و`Assets/TextMesh Pro/*`، و`Assets/_Project/Resources/Fonts/*`، و`ProjectSettings/*`.
3. الاختبارات: **Window ▸ General ▸ Test Runner ▸ EditMode ▸ Run All**.
4. البناء: **Football Quest ▸ Build ▸ Android (APK)** أو **iOS (Xcode project)**. الناتج في `unity/FootballQuest/Builds/`.

### 3.4 تشغيل اللعبة على المحاكي (بدون Firebase SDK)

بدون حزم Firebase، العميل يتصل بـ Emulator Suite عبر HTTP (`EmulatorAuthGateway` و`EmulatorFunctionsClient`):

1. شغّل المحاكي (§3.1، الأمر اليدوي).
2. اضغط Play في Unity من مشهد `Boot`. المضيف الافتراضي `127.0.0.1`، وفي محاكي Android `10.0.2.2`.
3. جهاز حقيقي على نفس الشبكة: اضبط PlayerPrefs `fq.emulator_host` على IP جهاز التطوير، وشغّل المحاكي بـ `--host 0.0.0.0` أو عدّل `host` في `firebase.json` محليًا.
4. **محاكاة الأذونات في Editor:** اضبط PlayerPrefs ‏`fq.editor_perm.Location` و`fq.editor_perm.Camera` بالقيم: 0 NotDetermined، و1 Granted، و2 Approximate، و3 Denied، و4 Restricted. هكذا تجرّب كل حالات AT-01.
5. ربط Apple/Google يحتاج Firebase SDK وأجهزة حقيقية، وأزراره مخفية في وضع المحاكي.
6. **«منتخبنا يجمعنا» محليًا (S8):** ظاهر دائمًا في وضع المحاكي (`feature_coop` = true). تحتاج عميلين أو أكثر (Editor + جهاز أو محاكي Android)، وكل لاعب يمسح رمز الفرع اليوم في نفس الفرع: افتح «شاشة الفرع» في لوحة الشركاء (§3.1.4) وامسح الـQR. الحملة `co_op_win` ومخزونها من صفحة «الحملات» في اللوحة.
   - القطع: `content/players` (يكتبها `npm run seed:content`).
   - إغلاق الجولات عند `endsAt`: Cloud Task ‏`closeRound`، والاحتياط `sweepRoomsEveryMinute` (المحاكي يشغّل المجدولة يدويًا من واجهة Emulator UI، وأي نبض بعد الوقت ينهيها أيضًا).

### 3.5 إضافة Firebase Unity SDK (Q7)

1. حمّل Firebase Unity SDK بصيغة `.tgz` من موقع Firebase: الحزم app، وauth، وfunctions، وfirestore، وremote-config، وapp-check وcrashlytics. **لا تضف `firebase-analytics`** (AT-10).
2. حطها في `unity/FootballQuest/Packages/firebase/` وأضفها في `Packages/manifest.json` بصيغة `"com.google.firebase.functions": "file:firebase/com.google.firebase.functions-<ver>.tgz"`. بعد اعتماد Git LFS للمستودع ترفعها عبر LFS.
3. حط `google-services.json` و`GoogleService-Info.plist` لمشروع `fq-dev` في `Assets/` (مستثناة من git).
4. التجميعة `FootballQuest.Firebase` تتفعّل تلقائيًا (versionDefine ‏`FQ_FIREBASE`)، والتطبيق يتحول من المحاكي إلى Firebase.
5. App Check: الـDebug provider في Development builds. سجّل رمز الـdebug من السجل في Firebase Console.

**عند إضافة ملفات من خارج Unity:** شغّل `python3 tools/unity-meta.py unity/FootballQuest/Assets` قبل الـcommit عشان كل ملف يكون له `.meta` ثابت.

## 4. متغيرات البيئة والأسرار

| المتغير | أين | الغرض | الشريحة |
|---|---|---|---|
| `FUNCTIONS_EMULATOR` | يضبطه المحاكي تلقائيًا | تعطيل فرض App Check محليًا | S1 |
| `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` | يضبطها `emulators:exec` تلقائيًا | توجيه الاختبارات للمحاكي | S1 |
| `google-services.json` / `GoogleService-Info.plist` | `unity/FootballQuest/Assets/` (مستثناة من git). في CI يكتبها `fq-release.yml` من أسرار البيئة | ربط التطبيق بـ `fq-dev` أو `fq-prod` | S2 |
| مفتاح توقيع رموز الفروع (HMAC) | Secret Manager باسم `BRANCH_CODE_SECRET`: `firebase functions:secrets:set BRANCH_CODE_SECRET -P dev` (قيمة عشوائية ≥ 32 بايت). للمحاكي: `firebase/functions/.secret.local` ينشئه `test:emulator` تلقائيًا (مستثنى من git) | `scanBranchCode` و`getBranchScreen` و`rotateBranchCodesDaily` | S7 |
| مفاتيح التوقيع والمتجرين | أسرار GitHub Environments (§5.3) | `fq-release.yml` | S10a |

**قاعدة:** ما يُرفع أي سر للمستودع. ملفات إعداد Firebase للعميل مستثناة في `unity/FootballQuest/.gitignore`.

## 5. إعداد CI (GitHub Actions)

| Workflow | يشتغل عند | المهام |
|---|---|---|
| `fq-backend.yml` | تغيّر `firebase/**` أو `shared/contracts/**` | lint، وtypecheck، والوحدات، والمحاكي |
| `fq-admin-web.yml` | تغيّر `admin-web/**` أو `firebase/**` | typecheck، والوحدات، والبناء، وe2e بـ Playwright على المحاكي (لقطات الشاشة artifact) |
| `fq-unity.yml` | تغيّر `unity/**` أو `shared/contracts/**` أو `tools/core-tests/**` | `core-tests` (dotnet، ومنها تدقيق الخصوصية والمتجر `ReleaseAuditTests`)، ثم EditMode (GameCI)، ثم بناء Android وiOS |
| `fq-release.yml` | يدوي (Actions ▸ fq-release ▸ Run workflow) | فحوص، ثم AAB موقّع ورفع Google Play Internal (لـ `fq-prod`)، وiOS ← TestFlight (§5.3) |

### 5.1 ترخيص Unity لـ GameCI (مرة وحدة)

مهام EditMode والبناء تتخطى نفسها بتحذير لين تُضاف هذي الأسرار في **Settings ▸ Secrets and variables ▸ Actions**:

| السر | القيمة |
|---|---|
| `UNITY_EMAIL` | بريد حساب Unity |
| `UNITY_PASSWORD` | كلمة المرور |
| `UNITY_LICENSE` | **Personal:** محتوى ملف `Unity_lic.ulf` كاملًا بعد تفعيل Unity Hub على جهازك (Windows: `C:\ProgramData\Unity\`، وmacOS: `/Library/Application Support/Unity/`). **Pro:** استخدم `UNITY_SERIAL` بدلها حسب توثيق GameCI (game.ci/docs/github/activation) |

### 5.2 مخرجات البناء

- **Android:** ملف `FootballQuest.apk` كـ artifact لمدة 7 أيام.
- **iOS:** مشروع Xcode فقط. التوقيع والرفع في `fq-release.yml` (§5.3).

### 5.3 الإصدار الموقّع والرفع (S10a)

**مرة وحدة عند المالك:**
1. GitHub ▸ Settings ▸ Environments: أنشئ `fq-dev` و`fq-prod`، وحط فيها الأسرار تحت (أسرار Unity تبقى على مستوى المستودع).
2. **Android:** أنشئ مفتاح الرفع (Upload key):
   `keytool -genkeypair -v -keystore upload.keystore -alias fq-upload -keyalg RSA -keysize 4096 -validity 10000`
   فعّل Play App Signing. وارفع أول AAB **يدويًا** من Play Console على مسار Internal testing (Google ما تسمح بأول رفع عبر API)، ثم اربط حساب خدمة (Service account) بصلاحية «Release to testing tracks».
3. **iOS:** أنشئ التطبيق في App Store Connect بنفس `com.usersx.footballquest`، وفعّل قدرة Sign in with Apple للمعرّف، وأنشئ مفتاح API بدور App Manager.

| السر (في البيئة) | القيمة |
|---|---|
| `GOOGLE_SERVICES_JSON_B64` | `base64 -w0 google-services.json` لمشروع البيئة |
| `GOOGLE_SERVICE_INFO_PLIST_B64` | `base64 -w0 GoogleService-Info.plist` |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload.keystore` |
| `ANDROID_KEYSTORE_PASS` / `ANDROID_KEYALIAS_NAME` / `ANDROID_KEYALIAS_PASS` | كلمات مرور المفتاح والاسم المستعار |
| `PLAY_SERVICE_ACCOUNT_JSON` | ملف JSON لحساب الخدمة (نص كامل) — `fq-prod` فقط |
| `APPLE_TEAM_ID` | معرّف الفريق (10 أحرف) |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_P8_B64` | مفتاح App Store Connect API (`base64 -w0 AuthKey_XXXX.p8`) |

**التشغيل:** Actions ▸ `fq-release` ▸ Run workflow ▸ اختر البيئة والمنصة.
- `-releaseBuild` يفشل البناء إذا Firebase SDK (functions وcrashlytics) أو ملف الإعداد ناقص، عشان ما ينرفع إصدار على وضع المحاكي.
- رقم البناء = رقم تشغيل الـworkflow (يزيد دائمًا في المنصتين).
- الحجم: يفشل إذا AAB أكبر من 150 MB (ARCHITECTURE §2.2).
- `fq-dev` يبني ويحفظ AAB كـ artifact بدون رفع لـ Play. وTestFlight يستقبل البيئتين (اختبار داخلي).

**بعد الرفع:** اتبع `docs/store/RELEASE_CHECKLIST.md` (AT-09 وAT-10 وAT-11 وفحص الحقوق).

## 6. إعداد مشاريع Firebase (مرة وحدة، قبل Slice 2)

1. أنشئ مشروعين: `fq-dev` و`fq-prod` على خطة **Blaze** (Cloud Functions 2nd gen تحتاجها).
2. Firestore بوضع **Native** في المنطقة **`me-central2`**. ⚠️ المنطقة ما تتغير بعد الإنشاء.
3. Authentication: فعّل Anonymous، وApple، وGoogle.
4. App Check: Play Integrity لـ Android، وApp Attest لـ iOS.
5. **لا تفعّل Google Analytics** عند إنشاء المشروع (`PRODUCT_BRIEF.md` ت6، وAT-10).
6. تأكد من توفر Cloud Tasks وCloud Scheduler في `me-central2` (سؤال Q5 في الخطة).
7. **Cloud Tasks (S8):** فعّل Cloud Tasks API في المشروع. الطابور `closeRound` ينشئه النشر تلقائيًا في `me-central2` (Q5). إذا ما توفر، الدالة المجدولة كل دقيقة تكفي (AT-07: ≤ 60 ث).
8. **TOTP للوحة (Q27):** رقّ Authentication إلى Identity Platform، ثم فعّل TOTP:
   ```bash
   curl -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/<id>/config?updateMask=mfa" \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "X-Goog-User-Project: <id>" \
     -H "Content-Type: application/json" \
     -d '{"mfa":{"providerConfigs":[{"state":"ENABLED","totpProviderConfig":{"adjacentIntervals":5}}]}}'
   ```
   بعدها `ADMIN_MFA_REQUIRED=true` في `.env.fq-prod`: أول دخول لكل مسؤول يعرض QR للتسجيل، وبعده يطلب الرمز في كل دخول. موظف الفرع مستثنى.
9. تنبيهات الميزانية على `fq-prod`: 50% و80% و100% (ARCHITECTURE §11).
10. سياسة TTL في Firestore على حقل `expireAt` لمجموعة `events` (13 شهرًا — ARCHITECTURE §10):
   `gcloud firestore fields ttls update expireAt --collection-group=events --enable-ttl --project=<id>`

## 7. النشر

```bash
cd firebase/functions && npm ci && npm run check
cd ..
functions/node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes,functions -P dev    # fq-dev
functions/node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes,functions -P prod   # fq-prod (بعد اجتياز AT على dev)
```

- لوحة الشركاء على Hosting:
  ```bash
  functions/node_modules/.bin/firebase deploy --only hosting -P dev
  ```
  الـpredeploy يبني `admin-web/dist`.
- قبل النشر:
  - `.env.local` للوحة: مفاتيح مشروع الويب ومفتاح reCAPTCHA Enterprise.
  - App Check للويب مفعّل في Console.
- `ADMIN_MFA_REQUIRED=true` في `firebase/functions/.env.fq-prod` بعد تفعيل TOTP (Q27).
- **يوم إصدار R2:** `STREAK_REWARDS=true` في `firebase/functions/.env.fq-prod` (Q41)، ثم في Remote Config: `feature_coop` و`feature_player_cards` و`feature_streak` = true.
- الرفع للمتاجر: §5.3.

## 8. استكشاف الأخطاء

| العَرَض | الحل |
|---|---|
| `npm run test:emulator` يفشل بـ «Could not spawn java» | ثبّت JDK 21 وتأكد إن `java -version` يشتغل |
| منفذ 8080 أو 9099 أو 5001 مشغول | أوقف أي محاكي شغّال، أو غيّر المنافذ في `firebase.json` و`test/emulator/helpers.ts` |
| Unity يعيد توليد GUIDs | شغّل `tools/unity-meta.py` وسوّ commit لملفات `.meta` |
| مهام Unity في CI «skipped» | أسرار الترخيص غير مضبوطة (§5.1) |
| مربعات بدل الحروف العربية | Font Assets ما انخلقت: شغّل Apply Project Setup مرة ثانية بعد استيراد TMP Essentials |
| بناء Android يفشل بـ «ACCESS_BACKGROUND_LOCATION is forbidden» | مكتبة أضافت الإذن الممنوع — أزلها أو استبعد الإذن (MVP_SCOPE: لا Background Location) |
| `Error adding firestore function ... "request blocked"` عند تشغيل المحاكي | بيئة فيها `HTTPS_PROXY` بدون استثناء لـ 127.0.0.1: نسخة `firebase-tools` الحالية تتجاهل `NO_PROXY` لطلبات المحاكي الداخلية. شغّل المحاكي في بيئة بدون بروكسي (جهازك أو CI) |
| الخارطة تظهر خلف الواجهة بلون واحد | `FQ_Lit.mat` ما انخلق: شغّل Apply Project Setup |
| العميل في Editor ما يتصل | المحاكي غير شغّال، أو `fq.emulator_host` خطأ (§3.4) |
