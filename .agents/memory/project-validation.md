---
name: Project validation
description: Known distinction between production build health and the full TypeScript check.
---

البناء الإنتاجي وفحص TypeScript ينجحان حاليًا بعد إصلاح أخطاء التوافق في شاشات التحضير وإدارة النهمات.

**Why:** المشروع المستورد كان يحتوي على أخطاء فحص موزعة قبل تنفيذ لوحة التقارير، وإصلاحها الكامل يتجاوز نطاق تحسين الشاشة.

**How to apply:** بعد تعديل شاشات أخرى، شغّل `pnpm exec tsc --noEmit` و`pnpm build` معًا؛ نجاح البناء وحده لا يثبت خلو TypeScript من الأخطاء.

ملف القفل يثبت نسخًا أحدث متوافقة من بعض الحزم رغم أن `package.json` يعلن نطاقات أقدم؛ عند رفض سجل الحزم نسخة قديمة، استخدم تثبيتًا مقيدًا بملف القفل بدل تغيير الاعتماديات يدويًا.

**Why:** سجل الحزم قد لا يعرض النسخة الدنيا المعلنة، بينما يحتوي ملف القفل على نسخة متاحة ومطابقة للنطاق.

**How to apply:** ابدأ بـ `pnpm install --frozen-lockfile` قبل تحديث `package.json` أو `pnpm-lock.yaml` في بيئة الاستيراد.