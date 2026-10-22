#!/usr/bin/env bash
# AT-09 — قياس الإقلاع البارد والذاكرة على جهاز Android متوسط (4GB RAM) متصل بـ adb.
# يعتمد على سطور السجل اللي يكتبها التطبيق (Core/Diagnostics/PerformanceBudget.cs):
#   FQ-BOOT interactive_ms=<ms> screen=<step>     ← مرة عند أول شاشة تفاعلية
#   FQ-PERF scene=<scene> fps=<avg> mem_mb=<mb>   ← كل دقيقة
# الاستخدام:
#   tools/perf/at09-android.sh [package] [runs]     ← 10 تشغيلات باردة + حكم «9 من 10 أقل من 5 ث»
#   tools/perf/at09-android.sh --watch [package]    ← يعرض FQ-PERF أثناء التنقل اليدوي (المدن، والملاعب) + PSS
set -euo pipefail

BUDGET_MS=5000
REQUIRED=9
MAX_MEM_MB=600
MIN_FPS=30

if [[ "${1:-}" == "--watch" ]]; then
  PKG="${2:-com.usersx.footballquest}"
  echo "اضغط Ctrl+C للإيقاف. الحد: fps ≥ ${MIN_FPS}، والذاكرة ≤ ${MAX_MEM_MB} MB."
  adb logcat -c
  adb logcat -s Unity:I | grep --line-buffered "FQ-PERF" | while read -r line; do
    pss_kb=$(adb shell dumpsys meminfo "$PKG" | awk '/TOTAL PSS:/ {print $3; exit} /TOTAL:/ {print $2; exit}')
    echo "$line pss_mb=$(( ${pss_kb:-0} / 1024 ))"
  done
  exit 0
fi

PKG="${1:-com.usersx.footballquest}"
RUNS="${2:-10}"
adb get-state >/dev/null
echo "الجهاز: $(adb shell getprop ro.product.model | tr -d '\r') — Android $(adb shell getprop ro.build.version.release | tr -d '\r')"

results=()
for i in $(seq 1 "$RUNS"); do
  adb shell am force-stop "$PKG"
  adb shell am kill-all >/dev/null 2>&1 || true
  adb shell sync
  sleep 2
  adb logcat -c
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  ms=""
  for _ in $(seq 1 60); do
    ms=$(adb logcat -d -s Unity:I | sed -n 's/.*FQ-BOOT interactive_ms=\([0-9]*\).*/\1/p' | head -1)
    [[ -n "$ms" ]] && break
    sleep 0.5
  done
  if [[ -z "$ms" ]]; then ms=99999; echo "تشغيل $i: ما ظهر FQ-BOOT خلال 30 ث"; else echo "تشغيل $i: ${ms} ms"; fi
  results+=("$ms")
done

pass=0
for ms in "${results[@]}"; do (( ms < BUDGET_MS )) && pass=$((pass + 1)); done
pss_kb=$(adb shell dumpsys meminfo "$PKG" | awk '/TOTAL PSS:/ {print $3; exit} /TOTAL:/ {print $2; exit}')
echo "النتيجة: ${pass}/${RUNS} أقل من ${BUDGET_MS} ms (المطلوب ${REQUIRED}/10). الذاكرة بعد الإقلاع: $(( ${pss_kb:-0} / 1024 )) MB PSS."
(( pass * 10 >= REQUIRED * RUNS )) && (( RUNS >= 10 ))
