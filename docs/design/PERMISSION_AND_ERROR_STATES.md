# PERMISSION_AND_ERROR_STATES — الأذونات وحالات الخطأ

**الإصدار:** v1.0 — 21 أكتوبر 2026
**يعتمد على:** `GAME_RULES.md` v1.0، و`ARCHITECTURE.md` v1.0، و`ACCEPTANCE_TESTS.md` v1.0

## قواعد هذا الملف

- كل حالة لها **معرّف ثابت** يستخدمه الكود والتحليلات والاختبارات.
- النص العربي هو الأساس، والإنجليزي ترجمته.
- ما فيه رسالة تمنع اللعب الرقمي بسبب إذن أو موقع.
- **أنواع العرض:**

| النوع | الوصف |
|---|---|
| `toast` | شريط قصير يختفي بعد 3 ثوانٍ |
| `sheet` | لوحة سفلية بزر أو زرين |
| `dialog` | نافذة وسط الشاشة، للقرارات المهمة فقط |
| `inline` | نص داخل الشاشة نفسها |

---

## 1. الأذونات

### 1.1 القاعدة

- ما يُطلب أي إذن عند أول تشغيل.
- **إذن الموقع:** يُطلب أول مرة يضغط فيها اللاعب ميزة ميدانية، مثل «تحقق من قربي» أو «امسح رمز الفرع».
- **إذن الكاميرا:** يُطلب أول مرة يضغط فيها «امسح».
- قبل طلب النظام تظهر **شاشة شرح مسبقة** (Pre-prompt). ولو ضغط اللاعب «ليس الآن»، ما يُطلب إذن النظام أبدًا في هذي الجلسة.

### 1.2 نصوص الشرح المسبق

| المعرّف | النوع | العنوان | النص | الأزرار |
|---|---|---|---|---|
| `PERM_LOC_PRE` | sheet | موقعك يفتح مكافآت إضافية | نستخدم موقعك **مرة وحدة بس** وقت ما تفتح اللعبة أو تمسح رمز فرع، عشان نعرف إذا أنت قريب من ملعب أو فرع شريك. ما نتابعك في الخلفية، وما نحفظ موقعك، وما نشاركه مع أي جهة. | «سماح» / «ليس الآن» |
| `PERM_CAM_PRE` | sheet | الكاميرا لمسح الرموز | نحتاج الكاميرا عشان تمسح رمز الفرع أو رمز القسيمة. ما نصوّر ولا نحفظ أي صورة. | «سماح» / «ليس الآن» |

| ID | EN title | EN body |
|---|---|---|
| `PERM_LOC_PRE` | Your location unlocks extra rewards | We check your location **once only** when you open the game or scan a branch code, to see if you're near a stadium or partner branch. No background tracking, nothing stored, nothing shared. |
| `PERM_CAM_PRE` | Camera to scan codes | We need the camera to scan branch or coupon codes. We don't take or keep any photos. |

### 1.3 نصوص إذن النظام (Info.plist / Android)

| المفتاح | العربية | English |
|---|---|---|
| `NSLocationWhenInUseUsageDescription` | نستخدم موقعك أثناء استخدام اللعبة فقط لمعرفة قربك من الملاعب والفروع الشريكة ومنحك مكافآت القرب. | Used only while you use the game to check if you're near stadiums or partner branches and give proximity rewards. |
| `NSCameraUsageDescription` | لمسح رموز QR في الفروع الشريكة ورموز القسائم. | To scan QR codes at partner branches and coupon codes. |

**في Android:**
- يُطلب `ACCESS_FINE_LOCATION` أثناء الاستخدام فقط.
- **ممنوع** طلب `ACCESS_BACKGROUND_LOCATION`.

### 1.4 حالات الإذن

| المعرّف | المتى | النوع | العربية | الإجراء |
|---|---|---|---|---|
| `LOC_DENIED` | الإذن مرفوض | inline في بطاقة المكافآت الميدانية | مكافآت القرب متوقفة لأن الموقع غير مفعّل. اللعب الرقمي شغّال كامل. | زر «تفعيل من الإعدادات» يفتح إعدادات النظام. وما فيه إعادة طلب تلقائي |
| `LOC_RESTRICTED` | الإذن مقيد من الجهاز (رقابة أبوية أو سياسة جهاز) | inline | الموقع مقيد على هذا الجهاز، فمكافآت القرب غير متاحة. | بدون زر |
| `LOC_APPROX_ONLY` | iOS «موقع تقريبي» أو Android «Coarse» | sheet | الموقع التقريبي ما يكفي للتحقق من الفروع. فعّل «الموقع الدقيق» عشان تحصل على مكافآت الفروع. | «فتح الإعدادات» / «لاحقًا» |
| `CAM_DENIED` | إذن الكاميرا مرفوض | sheet | ما نقدر نمسح بدون الكاميرا. تقدر تكتب الرمز يدويًا بدلًا منه. | «إدخال يدوي» / «فتح الإعدادات» |

---

## 2. الموقع والمناطق

| المعرّف | الشرط (`GAME_RULES.md` §6.1) | النوع | العربية | English |
|---|---|---|---|---|
| `LOC_TIMEOUT` | ما وصلت قراءة خلال 8 ثوانٍ | toast | ما قدرنا نحدد موقعك الحين. جرّب مرة ثانية. | Couldn't get your location. Try again. |
| `LOC_WEAK` | الدقة أسوأ من 100 م | sheet | الإشارة ضعيفة — جرّب قرب النافذة أو خارج المبنى. | Weak signal — try near a window or outside. |
| `LOC_OUT_OF_ZONE` | خارج نطاق المنطقة | toast | أنت خارج نطاق الفرع. قرّب شوي وجرّب. | You're outside the branch area. Move closer and retry. |
| `LOC_MOCK` | علامة الموقع الوهمي (Android) | toast | ما قدرنا نتحقق من موقعك على هذا الجهاز. | We couldn't verify your location on this device. |
| `ZONE_STADIUM_OK` | قبول منطقة ملعب | toast احتفالي | أنت قرب [اسم الملعب]! +حزمة منتخب و20 XP | You're near [stadium]! +1 pack, 20 XP |
| `ZONE_STADIUM_DONE` | سبق أخذها اليوم | inline | أخذت مكافأة هذا الملعب اليوم. ترجع بكرة! | Already collected here today. Back tomorrow! |
| `ZONE_BRANCH_NEARBY` | قبول منطقة فرع | sheet (`branch_nearby_shown`) | أنت قريب من [الفرع] — [عدد] حملات نشطة. | You're near [branch] — [n] active offers. |

> `LOC_MOCK` يُعامل مثل الرفض العادي: ما يُتهم اللاعب بالغش، ويُسجل الحدث في الخادم فقط.

---

## 3. رمز الفرع اليومي

| المعرّف | المتى | النوع | العربية | English |
|---|---|---|---|---|
| `QR_CHECKIN_VERIFIED` | رمز صالح + موقع مقبول | sheet احتفالي | زيارة محققة في [الفرع]! +حزمة و30 XP. الغرف والمهام مفتوحة لك اليوم. | Verified visit at [branch]! +1 pack, 30 XP. Rooms unlocked today. |
| `QR_CHECKIN_UNVERIFIED` | رمز صالح بدون موقع مقبول | sheet | تم تسجيل حضورك والغرف مفتوحة. فعّل الموقع عند المسح عشان تُحتسب زيارة محققة وقسائم الزيارة. | Checked in, rooms unlocked. Enable location when scanning for a verified visit and visit coupons. |
| `QR_ALREADY_TODAY` | نفس اللاعب ونفس الفرع اليوم | toast | مسجّل حضورك هنا اليوم ✓ | Already checked in here today ✓ |
| `QR_INVALID` | رمز أمس، أو توقيع خاطئ، أو صيغة غير معروفة | sheet | الرمز غير صالح — امسح رمز اليوم في الفرع. | Invalid code — scan today's code at the branch. |
| `QR_BRANCH_INACTIVE` | الفرع موقوف | sheet | هذا الفرع غير مشارك حاليًا. | This branch isn't participating right now. |

---

## 4. القسائم

| المعرّف | المتى | النوع | العربية | English |
|---|---|---|---|---|
| `CPN_ISSUED` | منح قسيمة | sheet احتفالي | 🎉 قسيمة جديدة: [عنوان الحملة]. صالحة لين [التاريخ]. | New coupon: [title]. Valid until [date]. |
| `CPN_SOLD_OUT_BRANCH` | المخزون في الفرع = 0 | inline | نفدت قسائم هذا الفرع. مكافآتك الثانية محسوبة. | This branch is out of coupons. Your other rewards still count. |
| `CPN_USER_LIMIT` | وصل حد الحساب | inline | استلمت الحد الأقصى من هذي الحملة. | You've reached this offer's limit. |
| `CPN_NEED_LOCATION` | حملة `verified_visit` واللاعب بدون موقع مقبول | inline | فعّل الموقع عند المسح عشان تحصل على هذي القسيمة. | Enable location when scanning to get this coupon. |
| `CPN_EXPIRED` | فتح قسيمة منتهية | inline في المحفظة | انتهت صلاحية هذي القسيمة في [التاريخ]. | This coupon expired on [date]. |

### 4.1 شاشة الموظف (لوحة الشركاء)

| المعرّف | المتى | العربية |
|---|---|---|
| `STAFF_REDEEM_OK` | نجاح الاسترداد | ✓ تم الاسترداد: [عنوان الحملة] — [الوقت] |
| `STAFF_REDEEM_USED` | القسيمة `redeemed` | ✗ القسيمة مستخدمة — استُردت في [الفرع] الساعة [الوقت]. |
| `STAFF_REDEEM_EXPIRED` | منتهية | ✗ القسيمة منتهية الصلاحية. |
| `STAFF_REDEEM_WRONG_BRANCH` | الفرع غير مشمول | ✗ هذي القسيمة غير صالحة في هذا الفرع. |
| `STAFF_REDEEM_NOT_FOUND` | رمز غير معروف | ✗ رمز غير معروف. تأكد من الإدخال. |
| `STAFF_RATE_LIMIT` | أكثر من 10 إدخالات يدوية في الدقيقة | محاولات كثيرة — انتظر دقيقة. |

### 4.2 رمز الفاتورة

| المعرّف | المتى | النوع | العربية | English |
|---|---|---|---|---|
| `INV_OK` | رمز صالح | → `CPN_ISSUED` | — | — |
| `INV_USED` | مستخدم | inline | هذا الرمز مستخدم من قبل. | This code was already used. |
| `INV_EXPIRED` | أكثر من 24 ساعة | inline | انتهت صلاحية الرمز. اطلب رمزًا جديدًا من الكاشير. | Code expired. Ask the cashier for a new one. |
| `INV_INVALID` | غير موجود | inline | الرمز غير صحيح. تأكد من الأحرف. | Incorrect code. Check the letters. |

---

## 5. «منتخبنا يجمعنا»

| المعرّف | المتى | النوع | العربية | English |
|---|---|---|---|---|
| `ROOM_NEED_CHECKIN` | إنشاء أو انضمام بدون تسجيل حضور اليوم في هذا الفرع | sheet | امسح رمز الفرع أول عشان تفتح الغرف. | Scan the branch code first to unlock rooms. |
| `ROOM_NOT_FOUND` | رمز غرفة غير موجود في هذا الفرع | inline | ما فيه غرفة بهذا الرمز هنا. | No room with this code here. |
| `ROOM_FULL` | 6 لاعبين | inline | الغرفة مكتملة (6 لاعبين). | Room is full (6 players). |
| `ROOM_STARTED` | الحالة غير `open` | inline | الجولة بدأت. انتظرهم أو افتح غرفة جديدة. | Round already started. Wait or open a new room. |
| `ROOM_LOBBY_EXPIRED` | مرت 10 دقائق | dialog | انتهت مهلة الغرفة. افتحوا غرفة جديدة. | Room timed out. Open a new one. |
| `ROOM_NEED_TWO` | ضغط «ابدأ» بلاعب واحد | toast | تحتاجون لاعبين اثنين على الأقل. | You need at least 2 players. |
| `ROUND_WITH_COUPONS` | `couponMode = with_coupons` | dialog قبل العد | الجولة بقسيمة لكل لاعب إذا فزتوا! | Win and everyone gets a coupon! |
| `ROUND_NO_COUPONS` | `couponMode = no_coupons` | dialog قبل العد | المكافأة المتبقية في هذا الفرع لا تكفي الفريق — ستلعبون بدون قسائم. والفوز يعطي كل لاعب حزمة ملحمية مضمونة. | Not enough coupons left for the whole team — you'll play without coupons. Winning gives each player a guaranteed Epic pack. |
| `ROUND_USER_NOT_ELIGIBLE` | لاعب وصل حد الحملة | inline لهذا اللاعب فقط | استلمت حد هذي الحملة، فمكافأتك عند الفوز حزمة ملحمية بدل القسيمة. | You've reached this offer's limit — your win reward is an Epic pack instead. |
| `ROUND_WRONG` | تأكيد خاطئ | toast | [س] من [ع] صحيحة — −15 ثانية. | [x] of [n] correct — −15s. |
| `ROUND_HOST_CHANGED` | انتقال المضيفية | toast | انتقلت القيادة إلى [الاسم]. | [name] is now the host. |
| `ROUND_PLAYER_LEFT` | خروج لاعب | toast | [الاسم] طلع — وزّعنا خاناته عليكم. | [name] left — their slots are now yours. |
| `ROUND_RECONNECTING` | انقطاع الشبكة أثناء الجولة | inline شريط أعلى | الاتصال ضعيف… نحاول نرجعك. الوقت ما يتوقف. | Reconnecting… the clock keeps running. |
| `ROUND_WON` | `won` | شاشة نتيجة | فزتوا كلكم! 🏆 | You all won! 🏆 |
| `ROUND_LOST` | `lost` | شاشة نتيجة | خلص الوقت. تقدرون تجربون مرة ثانية. | Time's up. Try again together. |
| `ROUND_DAILY_CAP` | 5 جولات فائزة اليوم | inline | وصلت حد مكافآت الفوز اليوم. تقدر تلعب للمتعة. | Daily win-reward cap reached. Play for fun. |

---

## 6. الحساب والعمر

| المعرّف | المتى | النوع | العربية |
|---|---|---|---|
| `AGE_GATE` | أول تشغيل | شاشة كاملة | كم عمرك؟ اختر سنة ميلادك. (نحفظ الفئة العمرية فقط) |
| `AGE_UNDER_15` | أقل من 15 | شاشة كاملة | اللعبة مخصصة لعمر 15 سنة فأكثر. نشوفك قريب! (بدون إنشاء حساب) |
| `ACC_GUEST_LINK` | ضيف بعد أول قسيمة | sheet | احفظ قسائمك وتقدمك: اربط حسابك مع Apple أو Google. |
| `ACC_DELETE_CONFIRM` | طلب الحذف | dialog | حذف الحساب نهائي: تقدمك وقسائمك غير المستردة تنحذف خلال 30 يومًا. متأكد؟ |
| `ACC_DELETE_DONE` | بعد التأكيد | dialog | استلمنا طلبك، وبينحذف حسابك خلال 30 يومًا. |
| `CITY_CHANGE_LOCKED` | تغيير المدينة قبل 30 يومًا | inline | تقدر تغيّر مدينتك بعد [التاريخ]. |

---

## 7. حالات عامة

| المعرّف | المتى | النوع | العربية | English |
|---|---|---|---|---|
| `NET_OFFLINE` | بدون اتصال | شريط ثابت أعلى | أنت غير متصل. تقدر تتصفح الخريطة والمجموعة، والمكافآت تحتاج اتصال. | You're offline. Browse the map and collection; rewards need a connection. |
| `SRV_BUSY` | خطأ خادم مؤقت (5xx) أو تعارض معاملة بعد 3 محاولات | toast | الضغط عالي الحين. جرّب بعد شوي. | We're busy right now. Try again shortly. |
| `APP_INTEGRITY` | فشل App Check | dialog | ما قدرنا نتحقق من نسخة التطبيق. حدّث اللعبة من المتجر. | We couldn't verify this app version. Please update from the store. |
| `FORCE_UPDATE` | الإصدار أقل من `min_app_version` | شاشة كاملة | فيه تحديث مهم للعبة. حدّثها عشان تكمل. | An important update is available. Update to continue. |
| `FEATURE_SOON` | ميزة مفتاحها `false` | ما تظهر أصلًا | — | — |

**إعادة المحاولة:**
- كل طلب يغير رصيدًا يُعاد تلقائيًا حتى 3 مرات بنفس `requestId`.
- اللاعب ما يشوف تكرارًا في المكافأة أبدًا.

---

## 8. ربط الحالات بالاختبارات

| الاختبار | الحالات |
|---|---|
| AT-01 | `PERM_LOC_PRE`، و`LOC_DENIED`، و`QR_CHECKIN_UNVERIFIED`، و`CPN_NEED_LOCATION` |
| AT-02 | `LOC_WEAK`، و`LOC_OUT_OF_ZONE`، و`ZONE_BRANCH_NEARBY` |
| AT-03 | `QR_CHECKIN_VERIFIED`، و`QR_ALREADY_TODAY`، و`QR_INVALID` |
| AT-04 | `STAFF_REDEEM_OK`، و`STAFF_REDEEM_USED` |
| AT-05 | `CPN_ISSUED`، و`CPN_SOLD_OUT_BRANCH` |
| AT-06 | `ROUND_HOST_CHANGED`، و`ROUND_PLAYER_LEFT` |
| AT-07 و AT-08 | `ROUND_WITH_COUPONS`، و`ROUND_NO_COUPONS`، و`ROUND_USER_NOT_ELIGIBLE` |
| AT-11 | كل النصوص بالعربية والإنجليزية بدون قص |
