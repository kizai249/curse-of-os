# النشر

## الخيار 1: Node (موصى به، مع الذكاء الاصطناعي)
يشتغل على أي منصة Node 20+: Render، أو Railway، أو Fly.io، أو VPS.
1. اربطوا المستودع، وخلّوا مجلد الجذر `USER-X_Cinematic_Interactive_Website`.
2. أمر البناء `npm ci`، وأمر التشغيل `npm start`.
3. ضيفوا المتغيرات من `docs/API_CONFIGURATION.md` في إعدادات المنصة (Environment / Secrets)، مو في الكود.
4. فعّلوا HTTPS (تلقائي في هالمنصات)، و`TRUST_PROXY=1` لأنها خلف proxy.
5. افحصوا `https://<domain>/api/health`. لازم يرجّع `"ai": true` بعد إضافة المفتاح.

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY server ./server
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
```
```bash
docker build -t user-x-site . && docker run -p 8080:8080 --env-file .env user-x-site
```

## الخيار 2: موقع ثابت (بدون ذكاء اصطناعي)
ارفعوا مجلد `public/` على Netlify أو Vercel أو GitHub Pages أو Cloudflare Pages.
- `/api/health` ما بيكون موجود، فنقطة يشتغل تلقائياً في وضع المعلومات المؤكدة. الحجز بالواتساب وكل المشاهد تشتغل.
- أضيفوا ترويسات الأمان من `server/server.js` (SECURITY) في إعدادات المنصة.

## قبل الإطلاق
- البريد الرسمي وحسابات التواصل: `USERSX_CONFIG` في أعلى `index.html`.
- سياسة خصوصية رسمية (انظر API_CONFIGURATION).
- صورة مشاركة (og:image) بمقاس 1200×630. اقترح أصل جاهز في `ASSET_REQUIREMENTS.md`.
- ربط الدومين، ثم تجربة نموذج الحجز من جوال حقيقي للتأكد إن واتساب ينفتح.
