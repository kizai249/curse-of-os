# RUNBOOK — دليل البناء والتشغيل والنشر

**آخر تحديث:** Slice 1 — 21 أكتوبر 2026
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

### 3.2 منطق C# بدون Unity

```bash
dotnet test tools/core-tests/CoreTests.csproj
```

يبني `Assets/_Project/Scripts/Core` واختباراته في `Tests/EditMode/Core`، وهي نفس الملفات اللي يبنيها Unity.

### 3.3 Unity

1. افتح `unity/FootballQuest` من Unity Hub.
2. أول مرة فقط: **Football Quest ▸ Apply Project Setup**. هذا ينشئ أصل URP في `Assets/_Project/Settings/` ويضبط PlayerSettings وBuild Settings. بعدها سوّ commit للملفات الناتجة (`Assets/_Project/Settings/*` و`ProjectSettings/*`).
3. الاختبارات: **Window ▸ General ▸ Test Runner ▸ EditMode ▸ Run All**.
4. البناء: **Football Quest ▸ Build ▸ Android (APK)** أو **iOS (Xcode project)**. الناتج في `unity/FootballQuest/Builds/`.

**عند إضافة ملفات من خارج Unity:** شغّل `python3 tools/unity-meta.py unity/FootballQuest/Assets` قبل الـcommit عشان كل ملف يكون له `.meta` ثابت.

## 4. متغيرات البيئة والأسرار

| المتغير | أين | الغرض | الشريحة |
|---|---|---|---|
| `FUNCTIONS_EMULATOR` | يضبطه المحاكي تلقائيًا | تعطيل فرض App Check محليًا | S1 |
| `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` | يضبطها `emulators:exec` تلقائيًا | توجيه الاختبارات للمحاكي | S1 |
| `google-services.json` / `GoogleService-Info.plist` | `unity/FootballQuest/Assets/StreamingAssets/` (مستثناة من git) | ربط التطبيق بـ `fq-dev` أو `fq-prod` | S2 |
| مفتاح توقيع رموز الفروع (HMAC) | Secret Manager باسم `BRANCH_CODE_SECRET` | `rotateBranchCodes` و`scanBranchCode` | S7 |
| مفاتيح متجر Apple وGoogle | أسرار GitHub | الرفع الآلي | S10a |

**قاعدة:** ما يُرفع أي سر للمستودع. ملفات إعداد Firebase للعميل مستثناة في `unity/FootballQuest/.gitignore`.

## 5. إعداد CI (GitHub Actions)

| Workflow | يشتغل عند | المهام |
|---|---|---|
| `fq-backend.yml` | تغيّر `firebase/**` أو `shared/contracts/**` | lint، وtypecheck، والوحدات، والمحاكي |
| `fq-unity.yml` | تغيّر `unity/**` أو `shared/contracts/**` أو `tools/core-tests/**` | `core-tests` (dotnet)، ثم EditMode (GameCI)، ثم بناء Android وiOS |

### 5.1 ترخيص Unity لـ GameCI (مرة وحدة)

مهام EditMode والبناء تتخطى نفسها بتحذير لين تُضاف هذي الأسرار في **Settings ▸ Secrets and variables ▸ Actions**:

| السر | القيمة |
|---|---|
| `UNITY_EMAIL` | بريد حساب Unity |
| `UNITY_PASSWORD` | كلمة المرور |
| `UNITY_LICENSE` | **Personal:** محتوى ملف `Unity_lic.ulf` كاملًا بعد تفعيل Unity Hub على جهازك (Windows: `C:\ProgramData\Unity\`، وmacOS: `/Library/Application Support/Unity/`). **Pro:** استخدم `UNITY_SERIAL` بدلها حسب توثيق GameCI (game.ci/docs/github/activation) |

### 5.2 مخرجات البناء

- **Android:** ملف `FootballQuest.apk` كـ artifact لمدة 7 أيام.
- **iOS:** مشروع Xcode فقط. التوقيع وIPA على macOS runner في Slice 10a.

## 6. إعداد مشاريع Firebase (مرة وحدة، قبل Slice 2)

1. أنشئ مشروعين: `fq-dev` و`fq-prod` على خطة **Blaze** (Cloud Functions 2nd gen تحتاجها).
2. Firestore بوضع **Native** في المنطقة **`me-central2`**. ⚠️ المنطقة ما تتغير بعد الإنشاء.
3. Authentication: فعّل Anonymous، وApple، وGoogle.
4. App Check: Play Integrity لـ Android، وApp Attest لـ iOS.
5. **لا تفعّل Google Analytics** عند إنشاء المشروع (`PRODUCT_BRIEF.md` ت6، وAT-10).
6. تأكد من توفر Cloud Tasks وCloud Scheduler في `me-central2` (سؤال Q5 في الخطة).
7. تنبيهات الميزانية على `fq-prod`: 50% و80% و100% (ARCHITECTURE §11).

## 7. النشر

```bash
cd firebase/functions && npm ci && npm run check
cd ..
functions/node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes,functions -P dev    # fq-dev
functions/node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes,functions -P prod   # fq-prod (بعد اجتياز AT على dev)
```

- لوحة الشركاء على Hosting (Slice 9).
- الرفع للمتاجر (Slice 10a).

## 8. استكشاف الأخطاء

| العَرَض | الحل |
|---|---|
| `npm run test:emulator` يفشل بـ «Could not spawn java» | ثبّت JDK 21 وتأكد إن `java -version` يشتغل |
| منفذ 8080 أو 9099 أو 5001 مشغول | أوقف أي محاكي شغّال، أو غيّر المنافذ في `firebase.json` و`test/emulator/helpers.ts` |
| Unity يعيد توليد GUIDs | شغّل `tools/unity-meta.py` وسوّ commit لملفات `.meta` |
| مهام Unity في CI «skipped» | أسرار الترخيص غير مضبوطة (§5.1) |
