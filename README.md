# Wahaty AI Mobile (واحتي للذكاء الاصطناعي)

تطبيق جوال متكامل ومفتوح المصدر مبني باستخدام **React Native (Expo)** يتيح للمستخدمين التفاعل مع نماذج الذاء الاصطناعي بطريقتين: تشغيل نماذج محلية بالكامل على جهاز الجوال (Offline) بدون حاجة لاتصال بالإنترنت باستخدام صيغة GGUF، أو استخدام محركات وسيرفرات بعيدة متوافقة مع واجهات برمجة تطبيقات OpenAI و Ollama.

يتميز التطبيق بوجود **صندوق ألعاب برمجية (Code Sandbox / Runner Preview)** متكامل يعيد بناء وتجميع كتل أكواد HTML و CSS و Javascript التي يولدها الذكاء الاصطناعي وتشغيلها على الفور داخل WebView تفاعلي.

---

An open-source, offline-first mobile assistant client built on **React Native (Expo)**. It enables running GGUF LLMs locally on-device without internet via `llama.rn`, and supports connection to OpenAI-compatible endpoints or Ollama. Additionally, it offers a **real-time code preview sandbox** that compiles and runs generated HTML, CSS, and JS.

---

## 🚀 المميزات الرئيسية / Key Features

*   **تشغيل محلي بالكامل (Fully Local Inference):** تشغيل النماذج بصيغة `.gguf` مباشرة على المعالج ومعالج الرسوميات للهاتف باستخدام مكتبة `llama.rn` المبنية على `llama.cpp`.
*   **خوادم خارجية (Remote Servers):** التوصيل والربط مع خوادم OpenAI المتوافقة أو سيرفرات Ollama المحلية/الشركية.
*   **معاينة الأكواد الحية (Interactive Code Sandbox):** عند توليد كود (HTML/CSS/JS)، يقوم التطبيق بتصفيته وجمعه وعرضه فورياً للمعاينة في صفحة مخصصة بـ WebView.
*   **تصميم مخصص للغة العربية (Arabic-First Web Design):** مظهر يدعم كلياً الخط العربي الافتراضي المبني على خط `Cairo` مع الملاءمة التلقائية للوضعين الليلي والنهاري (Dark/Light themes).
*   **إدارة سجل المحادثات (Chat History):** حفظ جلسات التحدث والرجوع لها في أي وقت.
*   **التحكم بالمعايير (Settings & Constraints):** تعديل درجة الحرارة (Temperature)، الحد الأقصى للمحارف، وعدد التهديدات البرمجية (Threads)، وحجم سياق الذاكرة للنموذج (Context size).

---

## 🛠️ التقنيات المستخدمة / Tech Stack

*   **الإطار البرمجي (Framework):** React Native, Expo v57.
*   **إدارة التنقل (Navigation):** Expo Router.
*   **محرك التشغيل المحلي (Inference engine):** `llama.rn` (llama.cpp implementation for React Native).
*   **المعاينة (Web Sandbox Preview):** `react-native-webview`.
*   **إدارة الحالة (State Management):** `useSyncExternalStore` مدمج مع `AsyncStorage`.
*   **الخط والتصميم (UI & Fonts):** `@expo-google-fonts/cairo` لدعم الهوية العربية بامتياز.

---

## 📥 متطلبات التشغيل والبدء / How to Run Locally

### 1. المتطلبات الأساسية (Prerequisites)
*   تثبيت Node.js.
*   تثبيت بيئة التطوير لنظام Android أو iOS (iOS requires Xcode, Android requires Android Studio & SDK).

### 2. التثبيت والتشغيل (Setup)

قم بتثبيت الحزم التابعة للمشروع:
```bash
npm install
```

لبدء تشغيل خادم المترو (Metro Bundler):
```bash
npm run start
```

لتشغيل التطبيق على نظام الأندرويد المحاكي أو جهازك الشخصي:
```bash
npm run android
```

لتشغيل التطبيق على نظام الـ iOS (محاكي أو جهاز حقيقي):
```bash
npm run ios
```

---

## 📂 خريطة المشروع / Codebase Structure

```text
├── app/                  # مسارات صفحات التطبيق (Expo Router)
│   ├── _layout.tsx       # البنية الجذرية للتطبيق ومحمل الخطوط
│   ├── index.tsx         # واجهة الدردشة وبث المحادثة (Streaming Chat)
│   ├── settings.tsx      # إعدادات النماذج المحلية والبعيدة وخصائص الذاكرة
│   ├── history.tsx       # إدارة وعرض سجل الدردشات السابقة
│   └── preview.tsx       # صندوق المعاينة الخاص بتشغيل كود الويب المولد
├── src/
│   ├── components/       # المكونات الرسومية للمحادثة وحقول الإدخال والكتل البرمجية
│   ├── services/         # محركات المحادثة (Local vs Remote Engine) ومدير الملفات
│   ├── store/            # إدارة الحالة وتخزين الإعدادات وجدول المحادثات
│   ├── theme/            # ثيمات الألوان وتنسيق المظهر النهاري والليلي
│   └── utils/            # دوال مساعدة لاستخراج الكود والتنظيف البرمجي
└── package.json          # الحزم التابعة ومحركات التشغيل
```

---

## 📜 الترخيص / License

المشروع مرخص تحت رخصة **MIT**. لمزيد من التفاصيل راجع ملف [LICENSE](./LICENSE).
