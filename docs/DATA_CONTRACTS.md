# DATA_CONTRACTS — عقود البيانات

**الإصدار:** v1.0 — 21 أكتوبر 2026
**يعتمد على:** `ARCHITECTURE.md` v1.0، و`GAME_RULES.md` v1.0
**قاعدة البيانات:** Firestore (Native) في `me-central2`

---

## 0. اصطلاحات عامة

| الاصطلاح | القاعدة |
|---|---|
| الوقت | كل حقول الوقت `timestamp` بتوقيت الخادم. وحقول «اليوم» نص بصيغة `YYYY-MM-DD` حسب يوم اللعبة (يبدأ 04:00 بتوقيت الرياض) |
| المعرّفات | سلاسل نصية. وحيث يُذكر نمط مركب (مثل `uid_branchId_date`) يكون هو معرّف المستند لضمان عدم التكرار |
| رموز المنتخبات | ثلاثية: KSA, AUS, BHR, CHN, IDN, IRN, IRQ, JPN, JOR, KUW, KGZ, PRK, OMA, PLE, QAT, SGP, KOR, SYR, TJK, THA, UAE, UZB, VIE, YEM |
| المدن | `RUH`، و`JED`، و`KHB` |
| صلاحية الكتابة | «خادم» تعني Cloud Functions فقط. و«عميل» مسموحة للتطبيق حسب قواعد الأمان |
| الموقع | ما فيه أي حقل يخزن إحداثيات لاعب في أي مجموعة. الإحداثيات المخزنة لمراكز المناطق (ملاعب وفروع) فقط |

---

## 1. Users — `users/{uid}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `createdAt` | timestamp | خادم | — |
| `authProvider` | `anonymous` \| `apple` \| `google` | خادم | — |
| `ageBand` | `15_17` \| `18_plus` | خادم | من بوابة العمر. وأقل من 15 ما يُنشأ له حساب |
| `city` | `RUH` \| `JED` \| `KHB` | خادم | للوحة المتصدرين |
| `cityChangedAt` | timestamp | خادم | التغيير مرة كل 30 يومًا |
| `displayName` | string | خادم | للقاصرين: اسم مستعار مولّد دائمًا |
| `level` | number | خادم | 1–30 |
| `xp` | number | خادم | — |
| `xpDay` | `{ day: string, value: number }` | خادم | للحد اليومي 600 |
| `fanPoints` | number | خادم | — |
| `packs` | number | خادم | حزم غير مفتوحة |
| `pityCount` | number | خادم | حزم متتالية بدون ملحمية أو أعلى |
| `streaks` | map: brandId → `{ count, lastDay }` | خادم | سلسلة الزيارات لكل علامة |
| `marketingConsent` | boolean | خادم | دائمًا `false` لـ `15_17` |
| `deletionRequestedAt` | timestamp \| null | خادم | — |

**المجموعات الفرعية:**
- `users/{uid}/teamCards/{teamCode_variant}` — الحقول: `teamCode`، و`variant` (`common` \| `rare` \| `epic` \| `legendary`)، و`count`، و`firstAt`.
- `users/{uid}/playerCards/{playerId}` — الحقول: `playerId`، و`count`، و`firstAt`.

```json
{
  "createdAt": "2027-01-07T16:02:11Z",
  "authProvider": "apple",
  "ageBand": "18_plus",
  "city": "JED",
  "cityChangedAt": "2027-01-07T16:02:30Z",
  "displayName": "صقر_جدة_27",
  "level": 6,
  "xp": 1820,
  "xpDay": { "day": "2027-01-12", "value": 240 },
  "fanPoints": 85,
  "packs": 2,
  "pityCount": 9,
  "streaks": { "brand_halfmillion": { "count": 3, "lastDay": "2027-01-12" } },
  "marketingConsent": false,
  "deletionRequestedAt": null
}
```

---

## 2. Branches — `branches/{branchId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `brandId` | string | خادم (لوحة) | — |
| `brandName` | `{ ar, en }` | خادم | — |
| `name` | `{ ar, en }` | خادم | — |
| `city` | `RUH` \| `JED` \| `KHB` | خادم | — |
| `zoneId` | string | خادم | منطقة الفرع |
| `active` | boolean | خادم | — |
| `createdAt` | timestamp | خادم | — |

**مجموعة فرعية للخادم فقط** (ما يقرأها العميل): `branches/{branchId}/daily/{day}` — الحقول: `token`، و`createdAt`.

```json
{
  "brandId": "brand_halfmillion",
  "brandName": { "ar": "هاف مليون", "en": "Half Million" },
  "name": { "ar": "فرع التحلية", "en": "Tahlia Branch" },
  "city": "JED",
  "zoneId": "zone_br_hm_jed_tahlia",
  "active": true,
  "createdAt": "2026-12-28T09:00:00Z"
}
```

> الأسماء أمثلة توضيحية لشكل البيانات فقط، ولا تعني وجود تعاقد.

---

## 3. Zones — `zones/{zoneId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `type` | `stadium` \| `branch` | خادم | — |
| `refId` | string | خادم | معرّف الملعب (مثل `STD_JED_KAS`) أو الفرع |
| `center` | `{ lat: number, lng: number }` | خادم | مركز المنطقة (منشأة، مو لاعب) |
| `radiusM` | number | خادم | ملعب: 1000–2000. فرع: 150–500 (الافتراضي 250) |
| `geohash5` | string | خادم | لتصفية المناطق القريبة في `verifyPresence` |
| `active` | boolean | خادم | — |

```json
{
  "type": "stadium",
  "refId": "STD_KHB_ARM",
  "center": { "lat": 26.0000, "lng": 50.0000 },
  "radiusM": 2000,
  "geohash5": "thdxx",
  "active": true
}
```

> الإحداثيات أعلاه قيم توضيحية للشكل، والقيم الحقيقية تُدخل من لوحة `usersx_admin`.

---

## 4. Campaigns — `campaigns/{campaignId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `brandId` | string | خادم (لوحة) | — |
| `title` | `{ ar, en }` | خادم | — |
| `terms` | `{ ar, en }` | خادم | شروط القسيمة الظاهرة للاعب |
| `trigger` | `co_op_win` \| `verified_visit` \| `visit_streak` \| `invoice_code` | خادم | — |
| `perUserLimit` | number | خادم | الافتراضي 1 |
| `startAt` / `endAt` | timestamp | خادم | — |
| `couponValidityDays` | number | خادم | الافتراضي 7 |
| `branchIds` | string[] | خادم | — |
| `status` | `draft` \| `active` \| `paused` \| `ended` | خادم | — |
| `totals` | `{ issued, redeemed }` | خادم | ملخص للعرض فقط |

**المجموعات الفرعية:**
- `campaigns/{campaignId}/stock/{branchId}` — الحقول: `total`، و`reserved`، و`issued`، و`remaining`.
  **ثابت إلزامي:** `remaining = total − reserved − issued` و`remaining ≥ 0` بعد كل معاملة.
- `campaigns/{campaignId}/claims/{uid}` — الحقول: `count`، و`lastAt`. لفرض `perUserLimit` داخل نفس المعاملة.

```json
{
  "brandId": "brand_halfmillion",
  "title": { "ar": "قهوة اليوم على الفريق", "en": "Team Coffee" },
  "terms": { "ar": "مشروب واحد مقاس وسط. صالحة 7 أيام في الفروع المشاركة.", "en": "One medium drink. Valid 7 days at participating branches." },
  "trigger": "co_op_win",
  "perUserLimit": 1,
  "startAt": "2027-01-15T01:00:00Z",
  "endAt": "2027-02-05T20:59:00Z",
  "couponValidityDays": 7,
  "branchIds": ["br_hm_jed_tahlia", "br_hm_jed_rawdah"],
  "status": "active",
  "totals": { "issued": 412, "redeemed": 187 }
}
```

```json
{ "total": 300, "reserved": 4, "issued": 210, "remaining": 86 }
```

---

## 5. Coupons — `coupons/{couponId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `campaignId` / `brandId` | string | خادم | — |
| `uid` | string | خادم | صاحب القسيمة |
| `issuedBranchId` | string | خادم | الفرع اللي خُصم من مخزونه |
| `status` | `reserved` \| `issued` \| `redeemed` \| `expired` \| `released` | خادم | — |
| `source` | `{ trigger, roomId?, visitId?, invoiceCodeId? }` | خادم | — |
| `reservedAt` / `issuedAt` / `expiresAt` | timestamp | خادم | — |
| `redeemTokenHash` | string | خادم | بصمة رمز QR الفردي |
| `manualCodeHash` | string | خادم | بصمة الرمز اليدوي (8 أحرف) |
| `redeemedAt` / `redeemedBranchId` / `redeemedBy` | timestamp / string / string | خادم | `redeemedBy` = معرّف حساب الموظف |

**يقرأ اللاعب قسائمه فقط.** والرمز الصريح يُرسل للعميل مرة وحدة عند المنح، ويُحفظ مشفرًا في التخزين الآمن للجهاز (Keychain / Keystore). ويقدر يطلب إعادة عرضه عبر الخادم.

```json
{
  "campaignId": "cmp_hm_coop_jan",
  "brandId": "brand_halfmillion",
  "uid": "u_8f2c",
  "issuedBranchId": "br_hm_jed_tahlia",
  "status": "issued",
  "source": { "trigger": "co_op_win", "roomId": "room_4471_20270115" },
  "reservedAt": "2027-01-15T18:20:02Z",
  "issuedAt": "2027-01-15T18:22:41Z",
  "expiresAt": "2027-01-22T18:22:41Z",
  "redeemTokenHash": "sha256:…",
  "manualCodeHash": "sha256:…",
  "redeemedAt": null,
  "redeemedBranchId": null,
  "redeemedBy": null
}
```

---

## 6. Rooms — `rooms/{roomId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `code` | string (4 أرقام) | خادم | فريد بين الغرف النشطة في نفس الفرع |
| `branchId` / `brandId` | string | خادم | — |
| `hostUid` | string | خادم | ينتقل لأقدم عضو عند خروج المضيف |
| `members` | `[{ uid, alias, joinedAt, active }]` | خادم | من 2 إلى 6 |
| `status` | `open` \| `locked` \| `playing` \| `won` \| `lost` \| `closed` | خادم | — |
| `lobbyExpiresAt` | timestamp | خادم | الإنشاء + 10 دقائق |
| `slotsCount` | 6 \| 8 \| 11 | خادم | حسب حجم الفريق عند البدء |
| `startAt` / `endsAt` | timestamp | خادم | `endsAt` = `startAt` + 180 ث − العقوبات |
| `penaltySec` | number | خادم | 15 لكل تأكيد خاطئ |
| `attempts` | number | خادم | — |
| `placements` | map: slotId → playerId | خادم | الحالة المشتركة الظاهرة للجميع |
| `lastCheck` | `{ correct: number, at }` | خادم | نتيجة آخر تأكيد |
| `couponMode` | `with_coupons` \| `no_coupons` \| `no_campaign` | خادم | يُعلن قبل البدء |
| `campaignId` | string \| null | خادم | — |
| `reservedCouponIds` | string[] | خادم | — |

**المجموعات الفرعية:**

| المسار | القارئ | الكاتب | المحتوى |
|---|---|---|---|
| `rooms/{roomId}/views/{uid}` | صاحب المنظور فقط | خادم | `{ slots: [{ slotId, requirement: {ar,en} }], infoCards: [{ playerId, stats }] }` |
| `rooms/{roomId}/presence/{uid}` | الأعضاء | عميل (`lastSeen` فقط) | — |
| `rooms/{roomId}/private/solution` | خادم فقط | خادم | — |

**مجموعة فريدة الرموز:** `roomCodes/{branchId_code}` — الحقول: `roomId`، و`expiresAt`.

```json
{
  "code": "4471",
  "branchId": "br_hm_jed_tahlia",
  "brandId": "brand_halfmillion",
  "hostUid": "u_8f2c",
  "members": [
    { "uid": "u_8f2c", "alias": "صقر_جدة_27", "joinedAt": "2027-01-15T18:17:40Z", "active": true },
    { "uid": "u_19aa", "alias": "نجم_البلد", "joinedAt": "2027-01-15T18:18:05Z", "active": true },
    { "uid": "u_c311", "alias": "موج_الكورنيش", "joinedAt": "2027-01-15T18:18:31Z", "active": true }
  ],
  "status": "playing",
  "lobbyExpiresAt": "2027-01-15T18:27:40Z",
  "slotsCount": 8,
  "startAt": "2027-01-15T18:20:02Z",
  "endsAt": "2027-01-15T18:22:47Z",
  "penaltySec": 15,
  "attempts": 1,
  "placements": { "s1": "p07", "s2": "p22", "s3": "p13" },
  "lastCheck": { "correct": 6, "at": "2027-01-15T18:21:40Z" },
  "couponMode": "with_coupons",
  "campaignId": "cmp_hm_coop_jan",
  "reservedCouponIds": ["cp_a1", "cp_a2", "cp_a3"]
}
```

---

## 7. MatchResults — `matchResults/{matchId}`

| الحقل | النوع | الكتابة | الوصف |
|---|---|---|---|
| `matchNo` | number (1–51) | خادم (`usersx_admin`) | — |
| `stage` | `group` \| `r16` \| `qf` \| `sf` \| `final` | خادم | — |
| `group` | `A`–`F` \| null | خادم | — |
| `day` | string | خادم | يوم المباراة |
| `stadiumId` | string \| null | خادم | يبقى `null` لين يتأكد الإسناد من مصدر رسمي |
| `home` / `away` | رمز منتخب أو مكان شاغر (مثل `1A`) | خادم | — |
| `status` | `scheduled` \| `finished` | خادم | — |
| `score` | `{ home, away }` \| null | خادم | يُدخل يدويًا بعد نهاية المباراة |
| `updatedBy` / `updatedAt` | string / timestamp | خادم | — |

**الاستخدام في اللعبة:** عرض جدول محطة الملعب، ووزن ×3 للمنتخبات اللي تلعب اليوم في الحزم، وكلمات «حروف المنتخب». **والنتائج ما تأثر على أي مكافأة.**

```json
{
  "matchNo": 1,
  "stage": "group",
  "group": "A",
  "day": "2027-01-07",
  "stadiumId": "STD_RUH_KFS",
  "home": "KSA",
  "away": "PLE",
  "status": "scheduled",
  "score": null,
  "updatedBy": "admin_khalid",
  "updatedAt": "2026-12-30T10:00:00Z"
}
```

---

## 8. مجموعات مساندة

| المسار | الغرض | الحقول الأساسية |
|---|---|---|
| `visits/{uid_branchId_day}` | تسجيل الحضور والزيارة المحققة (بدون تكرار) | `uid`، و`branchId`، و`brandId`، و`day`، و`verified`، و`accuracyBand`، و`scannedAt` |
| `invoiceCodes/{codeHash}` | رموز الفاتورة | `branchId`، و`campaignId`، و`issuedBy`، و`expiresAt`، و`usedBy`، و`usedAt` |
| `content/teams`، و`content/stadiums`، و`content/players` | المحتوى العام | قراءة عامة |
| `wordBank/{day}` | كلمات اليوم وحلولها | خادم فقط |
| `events/{eventId}` | الأحداث الخام | TTL بعد 13 شهرًا |
| `metricsDaily/{day_brandId_branchId}` | التجميع اليومي للتقارير | `checkIns`، و`verifiedVisits`، و`couponsIssued`، و`couponsRedeemed`، و`roomsCreated`، و`roundsStarted`، و`roundsWon`، و`uniquePlayers` |

---

## 9. الأحداث التحليلية

### 9.1 خصائص مشتركة لكل حدث

| الخاصية | النوع | الوصف |
|---|---|---|
| `eventId` | string | فريد لمنع التكرار |
| `name` | string | اسم الحدث |
| `ts` | timestamp | وقت الخادم |
| `uid` | string | معرّف Firebase (مستعار، وما يُرسل للشركاء) |
| `platform` | `ios` \| `android` | — |
| `appVersion` | string | — |
| `city` | `RUH` \| `JED` \| `KHB` | مدينة الملف |
| `source` | `client` \| `server` | من كتب الحدث |

**ممنوع في أي حدث:** الإحداثيات، أو الاسم، أو البريد، أو رقم الجوال، أو معرّف الإعلان.

### 9.2 الأحداث المطلوبة

| الحدث | المصدر | متى يُكتب | الخصائص الخاصة |
|---|---|---|---|
| `branch_nearby_shown` | client | عرض بطاقة «أنت قريب من فرع» بعد قبول `verifyPresence` لمنطقة فرع | `branchId`، و`brandId`، و`zoneRadiusM`، و`accuracyBand` (`<=25` \| `26-50` \| `51-100`)، و`activeCampaigns` (عدد) |
| `branch_visit_verified` | server (`scanBranchCode`) | أول زيارة محققة للاعب في الفرع في اليوم | `branchId`، و`brandId`، و`visitId`، و`accuracyBand`، و`streakCount`، و`firstVisitToBrand` (boolean) |
| `coupon_redeemed` | server (`redeemCoupon`) | نجاح الاسترداد | `couponId`، و`campaignId`، و`brandId`، و`redeemedBranchId`، و`issuedBranchId`، و`trigger`، و`minutesSinceIssue` |
| `co_op_room_created` | server (`createRoom`) | إنشاء غرفة | `roomId`، و`branchId`، و`brandId` |
| `co_op_win` | server (`submitLineup`) | الجولة تصير `won` | `roomId`، و`branchId`، و`brandId`، و`teamSize`، و`slotsCount`، و`durationSec`، و`attempts`، و`couponMode`، و`couponsIssued` |

```json
{
  "eventId": "ev_01HZX…",
  "name": "co_op_win",
  "ts": "2027-01-15T18:22:41Z",
  "uid": "u_8f2c",
  "platform": "android",
  "appVersion": "1.1.0",
  "city": "JED",
  "source": "server",
  "roomId": "room_4471_20270115",
  "branchId": "br_hm_jed_tahlia",
  "brandId": "brand_halfmillion",
  "teamSize": 3,
  "slotsCount": 8,
  "durationSec": 159,
  "attempts": 2,
  "couponMode": "with_coupons",
  "couponsIssued": 3
}
```

**ملاحظة لحدث `co_op_win`:** يُكتب حدث واحد للجولة. وصاحب `uid` فيه هو آخر من ضغط التأكيد، وعدد الفريق في `teamSize`.

### 9.3 ربط الأحداث بمؤشرات النجاح

| المؤشر | الحساب |
|---|---|
| زيارات الفروع المحققة | عدد `branch_visit_verified` |
| معدل الاسترداد | عدد `coupon_redeemed` ÷ عدد القسائم `issued` في `metricsDaily` لنفس الحملة |
| الجولات المكتملة | عدد `co_op_win` ÷ `roundsStarted` |
| التثبيتات | عدد المستندات الجديدة في `users` حسب `createdAt` |
