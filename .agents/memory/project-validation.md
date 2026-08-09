---
name: Project validation
description: Known distinction between production build health and the full TypeScript check.
---

البناء الإنتاجي هو معيار التحقق الحالي لتطبيق Figma Make، وقد ينجح حتى مع وجود أخطاء TypeScript قديمة في شاشات غير مستخدمة مباشرة.

**Why:** المشروع المستورد كان يحتوي على أخطاء فحص موزعة قبل تنفيذ لوحة التقارير، وإصلاحها الكامل يتجاوز نطاق تحسين الشاشة.

**How to apply:** عند تعديل شاشات أخرى، شغّل `pnpm exec tsc --noEmit` وأصلح الأخطاء المتبقية قبل اعتبار التحقق الشامل مكتملًا؛ لا تعتبر نجاح `pnpm build` دليلًا على خلو TypeScript من الأخطاء.