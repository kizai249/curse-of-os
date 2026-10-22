# PRIVACY_LABELS — إعلان الخصوصية في المتجرين

**الإصدار:** S10a — R1
**المصدر:** `DATA_CONTRACTS.md` (المجموعات والحقول)، و`ARCHITECTURE.md` §4 و§10.
**يطابق:** `unity/FootballQuest/Platform/iOS/PrivacyInfo.xcprivacy` (يفحصه `ReleaseAuditTests`).
**الحالة:** ⚠️ مسودة تقنية — تحتاج المراجعة القانونية الموقّعة المطلوبة في `RIGHTS_REGISTER.md` §5 (PDPL، والقاصرون).

> **القاعدة:** إذا تغيّر أي حقل في `DATA_CONTRACTS.md`، أو انضافت مكتبة تجمع بيانات، يتحدّث هذا الملف وملف `PrivacyInfo.xcprivacy` في نفس الـ commit.

## 1. ملخص

| السؤال | الإجابة |
|---|---|
| تتبّع (Tracking) بين تطبيقات أو مواقع شركات ثانية | **لا**: ما فيه معرّف إعلان، ولا IDFA، ولا SDK إعلانات أو تحليلات طرف ثالث (AT-10) |
| بيع البيانات | لا |
| مشاركة بيانات اللاعب مع طرف ثالث | لا. الشركاء يشوفون تقارير مجمّعة فقط، والخانات الأقل من 10 مخفية، وما فيها `uid` ولا اسم ولا إحداثيات |
| التشفير أثناء النقل | نعم (HTTPS/TLS لكل الطلبات) |
| حذف البيانات | نعم، من داخل التطبيق (`deleteAccount`): الحذف خلال 30 يوم |
| إقامة البيانات | Firestore وCloud Functions في `me-central2` (الدمام). Auth وCrashlytics خدمات عالمية (PRODUCT_BRIEF ت6) |

## 2. البيانات المجمعة

| البيان | المصدر في النظام | App Store (النوع الرسمي) | مرتبط بالهوية | الغرض | Google Play (Data Safety) |
|---|---|---|---|---|---|
| معرّف المستخدم | `users/{uid}` (Firebase Auth uid مستعار) | `NSPrivacyCollectedDataTypeUserID` | نعم | وظائف التطبيق، والتحليلات | Personal info → User IDs: Collected، Required، App functionality + Analytics |
| البريد الإلكتروني | Firebase Auth فقط لما يربط اللاعب حسابه بـ Apple أو Google (Apple ممكن يعطي بريد مخفي) | `NSPrivacyCollectedDataTypeEmailAddress` | نعم | وظائف التطبيق (الدخول) | Personal info → Email address: Collected، Optional، Account management |
| الموقع التقريبي | `users.city` (يختارها اللاعب)، و`visits` (الفرع واليوم ونطاق الدقة — بدون إحداثيات) | `NSPrivacyCollectedDataTypeCoarseLocation` | نعم | وظائف التطبيق | Location → Approximate location: Collected، Optional، App functionality |
| الموقع الدقيق | يُرسل لـ `verifyPresence` و`scanBranchCode` وقت الطلب فقط، و**ما يُخزن** (DATA_CONTRACTS §0) | ما يُعلن (معالجة لحظية — تعريف Apple للجمع يستثني البيانات اللي ما تُحفظ بعد خدمة الطلب) | — | — | Location → Precise location: Collected، **Processed ephemerally**، Optional، App functionality |
| تفاعل المنتج | `events` (DATA_CONTRACTS §9، TTL 13 شهر) | `NSPrivacyCollectedDataTypeProductInteraction` | نعم | التحليلات (للفريق، مو للإعلانات) | App activity → App interactions + Other actions: Collected، Required، Analytics |
| بيانات الأعطال | Crashlytics بدون `SetUserId` | `NSPrivacyCollectedDataTypeCrashData` | لا | وظائف التطبيق | App info and performance → Crash logs: Collected، Required، App functionality |
| الفئة العمرية | `users.ageBand` (`15_17` أو `18_plus` — ما نخزن تاريخ الميلاد) | `NSPrivacyCollectedDataTypeOtherDataTypes` | نعم | وظائف التطبيق (قيود القاصرين) | Personal info → Other info: Collected، Required، App functionality |

**مو مجمّع:** الاسم الحقيقي (الاسم المعروض مولّد دائمًا للقاصرين)، ورقم الجوال، وجهات الاتصال، والصور (الكاميرا لمسح QR فقط وما تُحفظ أي صورة)، ومعرّف الإعلان، والمشتريات (ما فيه مشتريات).

## 3. واجهات Apple ذات السبب المطلوب (Required Reason APIs)

| الفئة | السبب | الاستخدام |
|---|---|---|
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | `PlayerPrefs` (اللغة، والإفصاح، وكاش المحتوى) داخل التطبيق نفسه |

> مكتبات Unity وFirebase تضمّن ملفات Privacy Manifest خاصة فيها. وبعد إضافة Firebase SDK (Q7) نراجع تقرير الخصوصية في Xcode (Product → Archive → Generate Privacy Report) قبل الرفع.

## 4. أسئلة المراجعة القانونية

- TODO(owner): تأكيد إن إعلان «الموقع الدقيق» في Google Play كـ Processed ephemerally مقبول قانونيًا مقابل PDPL.
- TODO(owner): نص سياسة الخصوصية المنشورة (الرابط مطلوب في المتجرين وفي `listing.json`).
