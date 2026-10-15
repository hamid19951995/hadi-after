# AE_BOSS_OMEGA_Foundation_v155 — معماری جامع Master-FX

**سند معماری نرم‌افزار (Software Architecture Document)**
نسخه: 1.5.5 | وضعیت: Approved for Implementation | مخاطب: مهندسین نرم‌افزار، VFX/Motion Pipeline Leads

---

## فهرست مطالب (Table of Contents)

- [۱. معرفی، اهداف معماری و نیازمندی‌ها](#۱-معرفی-اهداف-معماری-و-نیازمندیها-system-scope--architectural-goals)
  - [۱.۱ دامنه سیستم](#۱۱-دامنه-سیستم)
  - [۱.۲ جداسازی لایه‌ها (Layer Separation)](#۱۲-جداسازی-لایهها-layer-separation)
  - [۱.۳ اصول پایداری و Locale-Independence](#۱۳-اصول-پایداری-و-locale-independence)
  - [۱.۴ Graceful Fallback](#۱۴-graceful-fallback)
  - [۱.۵ دیاگرام معماری لایه‌ای](#۱۵-دیاگرام-معماری-لایهای)
- [۲. موتور کشف و اسکن افکت‌ها (Introspection & Reflection Engine)](#۲-موتور-کشف-و-اسکن-افکتها-introspection--reflection-engine)
  - [۲.۱ کاتالوگ‌ساز JSX](#۲۱-کاتالوگساز-jsx)
  - [۲.۲ Introspection عمق پراپرتی‌ها](#۲۲-introspection-عمق-پراپرتیها)
  - [۲.۳ اسکیمای effects-catalog.json](#۲۳-اسکیمای-effects-catalogjson)
- [۳. لایه انتزاع افکت‌ها و پریست‌ها (FX & Preset Abstraction Layer)](#۳-لایه-انتزاع-افکتها-و-پریستها-fx--preset-abstraction-layer)
  - [۳.۱ Manifest JSON Schema](#۳۱-manifest-json-schema)
  - [۳.۲ لود پریست .ffx و Override پارامترها](#۳۲-لود-پریست-ffx-و-override-پارامترها)
  - [۳.۳ دسته‌بندی ماژولار](#۳۳-دستهبندی-ماژولار)
  - [۳.۴ Pipeline اجرای Stage ها](#۳۴-pipeline-اجراى-stage-ها)
- [۴. موتور قواعد تخصصی موشن و کامپوزیت](#۴-موتور-قواعد-تخصصی-موشن-و-کامپوزیت-motion-intelligence--design-rules)
  - [۴.۱ اتوماسیون کی‌فریم و Easing](#۴۱-اتوماسیون-کیفریم-و-easing)
  - [۴.۲ تزریق Expression های هوشمند](#۴۲-تزریق-expression-های-هوشمند)
  - [۴.۳ مدیریت Color Management و OCIO/ACES](#۴۳-مدیریت-color-management-و-ocioaces)
  - [۴.۴ Track Mattes](#۴۴-track-mattes)
- [۵. پایداری، اعتبارسنجی و مدیریت خطا (Resilience)](#۵-پایداری-اعتبارسنجی-و-مدیریت-خطا-resilience-validation--fallback)
  - [۵.۱ Pre-Validation مانیفست‌ها](#۵۱-pre-validation-مانیفستها)
  - [۵.۲ جدول استراتژی Fallback](#۵۲-جدول-استراتژی-fallback)
  - [۵.۳ خطایابی JSX و Undo Group](#۵۳-خطایابی-jsx-و-undo-group)
  - [۵.۴ Watchdog و Job Receipts](#۵۴-watchdog-و-job-receipts)
- [۶. ساختار پوشه‌ها و قراردادهای کد](#۶-ساختار-پوشهها-و-قراردادهای-کد-repository-directory-structure--interface-signatures)
  - [۶.۱ درخت پوشه‌ها](#۶۱-درخت-پوشهها)
  - [۶.۲ اینترفیس‌های Node.js](#۶۲-اینترفیسهای-nodejs)
  - [۶.۳ API عمومی JSX](#۶۳-api-عمومی-jsx)
- [۷. سناریوهای تستی و تست پیوسته (E2E Test Scenarios)](#۷-سناریوهای-تستی-و-تست-پیوسته-e2e-test-scenarios)
  - [۷.۱ تست شبیه‌سازی (Dry-Run)](#۷۱-تست-شبیهسازی-dry-run)
  - [۷.۲ تست Live و اعتبارسنجی Receipt](#۷۲-تست-live-و-اعتبارسنجی-receipt)
  - [۷.۳ خط لوله CI و معیارهای خروج](#۷۳-خط-لوله-ci-و-معیارهای-خروج)

---

# ۱. معرفی، اهداف معماری و نیازمندی‌ها (System Scope & Architectural Goals)

## ۱.۱ دامنه سیستم

پروژه **AE_BOSS_OMEGA_Foundation_v155** یک فریم‌ورک ماژولار است که در آن یک
**Orchestration Engine** مبتنی بر Node.js، تمام ابزارهای نصب‌شده روی After Effects —
هم نیتیو (Built-in Effects) و هم پلاگین‌های Third-Party مانند
**Trapcode Suite**، **Boris FX Continuum**، **Video Copilot Element 3D**،
**Optical Flares**، **Deep Glow** و **RSMB (ReelSmart Motion Blur)** — را مانند
یک **کامپوزیتور / موشن‌گرافیست ارشد** کنترل، پیکربندی، اعتبارسنجی و رندر می‌کند.

مسیر ارتباطی بین دو دنیا، پل **ExtendScript (JSX)** است:

| مؤلفه | فناوری | مسئولیت |
|---|---|---|
| Orchestration Layer | Node.js (TypeScript) | تحلیل مانیفست، اعتبارسنجی، تصمیم‌گیری، Fallback، صف رندر |
| Bridge | JSON Files + CEP/`-r` Launcher | انتقال پیام بین Node و AE بدون DLL |
| Execution Layer | ExtendScript (JSX) | دستکاری DOM پروژه AE: افکت، کی‌فریم، اکسپرشن، رندر |

## ۱.۲ جداسازی لایه‌ها (Layer Separation)

اصل اول معماری: **Node.js هرگز مستقیماً درباره‌ی DOM افتر افکت تصمیم نمی‌گیرد و
JSX هرگز درباره‌ی استراتژی محصول (Business Strategy) تصمیم نمی‌گیرد.**

- **Node.js Engine**: بدنه‌ی Decisions — «کدام افکت، با چه مقادیر، در چه ترتیبی،
  با چه جایگزینی در صورت غیبت پلاگین».
- **JSX Host Runner**: بدنه‌ی Mechanics — «چگونه یک `matchName` را روی یک
  `AVLayer` اعمال کنم، چگونه `KeyframeEase` بگذارم، چگونه Render Queue را بچینم».
- ارتباط دو طرف **صرفاً از طریق پیام‌های JSON با Contract نسخه‌دار** انجام می‌شود
  (`protocolVersion: "1.5"`). هیچ تابعی cross-call ندارد.

این جداسازی سه نتیجه‌ی مهندسی می‌دهد:

1. **Testability**: منطق Node با Mock کردن Bridge کاملاً Unit-Test پذیر است.
2. **Portability**: اجراکننده می‌تواند AE نسخه‌ی 2021 تا 2025 باشد بدون تغییر Engine.
3. **Crash Isolation**: اگر AE هنگ کند، Node با Watchdog بازیابی می‌کند و برعکس.

## ۱.۳ اصول پایداری و Locale-Independence

AE رابط کاربری Localized دارد؛ روی یک سیستم فارسی/آلمانی/ژاپنی، `displayName`
افکت‌ها ترجمه شده است و اسکریپتی که به DisplayName تکیه کند **قطعاً می‌شکند**.
بنابراین قواعد الزامی (Hard Rules):

| # | قاعده | جزئیات |
|---|---|---|
| R1 | **matchName الزامی** | هر ارجاع به افکت/پراپرتی فقط با `matchName` (مثلاً `CC Particle World`) — `displayName` فقط برای Log و UI انسانی. |
| R2 | Path Resolve با matchName | آدرس‌دهی پراپرتی‌های تو در تو با آرایه‌ی matchName ها، نه اندیس‌های عددی UI (اندیس‌ها بین نسخه‌ها جابجا می‌شوند). |
| R3 | Locale-safe parsing | هرگز پارس رشته‌ی پیام‌های UI AE ممنوع؛ فقط خواندن DOM. |
| R4 | Version Guard | حداقل نسخه‌ی AE در مانیفست اعلام و در Init بررسی می‌شود: `parseFloat(app.version) >= 18`. |
| R5 | Idempotency | اجرای دوباره‌ی یک Stage نباید State خراب کند؛ قبل از Apply، افکت قبلی با همان matchName حذف/بازنشانی می‌شود. |
| R6 | Undo Safety | هر فرمان JSX داخل `app.beginUndoGroup/endUndoGroup` است تا در صورت خطا، Project سالم بماند. |

نمونه‌ی Resolve امن با matchName (هرگز از `property(index)` استفاده نکنید):

```javascript
// resolve-by-matchName.jsx — ابزار مشترک، Locale-Independent
function resolveProp(container, matchNameChain) {
    // matchNameChain: ["ADBE Camera Lens Blur", "ADBE Camera Lens Blur-0002"]
    var node = container;
    for (var i = 0; i < matchNameChain.length; i++) {
        node = node.property(matchNameChain[i]); // بر اساس matchName، نه displayName
        if (!node) throw new Error("MISSING_PROP:" + matchNameChain.slice(0, i + 1).join("/"));
    }
    return node;
}
```

## ۱.۴ Graceful Fallback

هیچ Job نباید به‌خاطر غیبت یک پلاگین‌ی Third-Party شکست بخورد. اگر
`matchName` درخواستی در `effects-catalog.json` (که از `app.effects` ماشین هدف
تولید شده) پیدا نشود، **Fallback Resolver** (بخش ۵.۲) نزدیک‌ترین جایگزین
نیتیو را انتخاب، در مانیفست تزریق، و در Receipt شفاف ثبت می‌کند
(`fallbackChain: ["Deep Glow", "ADBE Glow"]`). کیفیت بصری ممکن است تغییر کند؛
پایداری خط تولید اولویت دارد و تفاوت در Receipt اطلاع‌رسانی می‌شود.

## ۱.۵ دیاگرام معماری لایه‌ای

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER (Node.js / TS)                │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐  │
│  │ Manifest   │ │ Fallback     │ │  Motion       │ │ Render       │  │
│  │ Validator  │ │ Resolver     │ │  Intelligence │ │ Orchestrator │  │
│  └─────┬──────┘ └──────┬───────┘ └──────┬────────┘ └──────┬───────┘  │
│        └───────────────┴───────┬────────┴─────────────────┘          │
│                        ┌───────▼────────┐        ┌───────────────┐   │
│                        │  FxEngine      │        │CatalogService │   │
│                        └───────┬────────┘        └───────────────┘   │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │ JSON Commands (Inbox) / Receipts (Outbox)
┌────────────────────────────────▼─────────────────────────────────────┐
│            FILE BRIDGE  (Inbox/  ←→  Outbox/  + Locks)               │
│        job-<id>.request.json        job-<id>.receipt.json            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  polling / app.scheduleTask
┌────────────────────────────────▼─────────────────────────────────────┐
│                  EXECUTION LAYER (ExtendScript / JSX)                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  HostRunner.jsx  : runCommand | introspectEffect | applyStage  │  │
│  │                    loadCatalog  | render                       │  │
│  └───────────────────────────────┬────────────────────────────────┘  │
│                                  ▼                                   │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  AE PROJECT (DOM) : Comp ▸ Layer ▸ Effects ▸ Properties ▸ Keys│   │
│  └───────────────────────────────────────────────────────────────┘   │
│        Trapcode Suite │ Boris FX │ Element 3D │ Optical Flares │...  │
└──────────────────────────────────────────────────────────────────────┘
```

نیازمندی‌های غیرعملیاتی (NFR): شروع سرد Bridge < 2s، فرمان ساده < 500ms،
هیچ فرمانی بدون Timeout نباشد (پیش‌فرض 120s)، مصرف حافظه‌ی Node < 300MB.

---

# ۲. موتور کشف و اسکن افکت‌ها (Introspection & Reflection Engine)

## ۲.۱ کاتالوگ‌ساز JSX

این اسکریپت کل `app.effects` را پیمایش می‌کند و برای هر افکت، متادیتا و
درخت پارامترها را استخراج و به‌صورت `effects-catalog.json` ذخیره می‌کند.
نسخه‌ی پلاگین‌ها در صورت وجود از `app.effects` قابل خواندن نیست؛ برای
Third-Party ها از فیلد `versionHint` (استخراج‌شده از نام MatchName یا
Registry در Node) استفاده می‌کنیم — در سند به‌عنوان `versionHint` مدل شده است.

```javascript
// build-effects-catalog.jsx
// خروجی: effects-catalog.json — منبع حقیقت (Single Source of Truth) برای Node
(function buildCatalog() {
    var OUT = Folder.myDocuments.fsName + "/AE_BOSS_OMEGA/effects-catalog.json";

    function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }

    function paramTypeCode(p) {
        // PropertyType: PROPERTY / INDEXED_GROUP / NAMED_GROUP
        if (p.propertyType === PropertyType.INDEXED_GROUP) return "INDEXED_GROUP";
        if (p.propertyType === PropertyType.NAMED_GROUP)   return "NAMED_GROUP";
        return "PROPERTY";
    }

    function valueTypeCode(p) {
        // PropertyValueType: OneD TwoD ThreeD FourD COLOR Slider Checkbox Angular Layer Index Mask Custom NoValue
        var t = p.propertyValueType;
        var map = {};
        map[PropertyValueType.OneD]        = "OneD";
        map[PropertyValueType.TwoD]        = "TwoD";
        map[PropertyValueType.ThreeD]      = "ThreeD";
        map[PropertyValueType.FOURD]       = "FOURD";
        map[PropertyValueType.COLOR]       = "COLOR";
        map[PropertyValueType.Slider]      = "Slider";
        map[PropertyValueType.Checkbox]    = "Checkbox";
        map[PropertyValueType.Angular]     = "Angular";
        map[PropertyValueType.LayerIndex]  = "Layer Index";
        map[PropertyValueType.MASK_INDEX]  = "Mask";
        map[PropertyValueType.CustomValue] = "Custom";
        map[PropertyValueType.NoValue]     = "NoValue";
        return (t in map) ? map[t] : "Unknown";
    }

    function boundsOf(p) {
        var b = { min: null, max: null, default: null };
        try {
            b.min = p.hasMin ? p.minimumValue : -Infinity;
            b.max = p.hasMax ? p.maximumValue :  Infinity;
        } catch (e) { /* بعضی پراپرتی‌ها Range ندارند */ }
        try {
            if (p.numKeys > 0) b.default = p.keyValue(1);
            else if (p.propertyValueType !== PropertyValueType.NoValue) b.default = p.value;
        } catch (e) { /* value در Context بدون Comp ممکن است خطا دهد */ }
        if (b.min !== null && isFinite(b.min) === false) b.min = null;
        if (b.max !== null && isFinite(b.max) === false) b.max = null;
        return b;
    }

    function walkParams(group, depth, out) {
        var result = out || [];
        if (depth > 4) return result; // سقف عمق برای جلوگیری از فریز
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p === null) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                var b = boundsOf(p);
                result.push({
                    matchName:  safe(function(){ return p.matchName; },  "?"),
                    displayName:safe(function(){ return p.name; },       "?"),
                    dataType:   valueTypeCode(p),
                    min:        b.min, max: b.max, default: b.default
                });
            } else {
                var kids = walkParams(p, depth + 1, []);
                result.push({
                    matchName:  safe(function(){ return p.matchName; }, "?"),
                    displayName:safe(function(){ return p.name; },      "?"),
                    dataType:   paramTypeCode(p),
                    params:     kids
                });
            }
        }
        return result;
    }

    // Comp موقت برای instantiate کردن هر افکت (بدون ذخیره‌ی Project)
    app.beginUndoGroup("OMEGA Build Catalog");
    var comp = app.project.items.addComp("_OMEGA_PROBE_", 64, 64, 1, 1, 24);
    var solid = comp.layers.addSolid([0,0,0], "_probe_", 64, 64, 1);

    var catalog = {
        schema:      "omega.effects-catalog/1.5",
        generatedAt: (new Date()).toISOString(),
        aeVersion:   app.version,
        locale:      app.isoLanguage,
        effects:     []
    };

    for (var i = 1; i <= app.effects.numEffects; i++) {
        var fx = app.effects(i); // Effect object با .matchName / .displayName / .category / .version
        var entry = {
            matchName:   fx.matchName,
            displayName: fx.displayName,
            category:    fx.category,
            versionHint: safe(function(){ return fx.version; }, null),
            installed:   true,
            params:      []
        };
        try {
            var inst = solid("Effects").addProperty(fx.matchName); // instantiate واقعی
            entry.params = walkParams(inst, 0, []);
            inst.remove();
        } catch (e) {
            entry.installed = false;
            entry.error = String(e.message || e);
        }
        catalog.effects.push(entry);
        if (i % 25 === 0) $.sleep(1); // اجازه‌ی نفس کشیدن به Host
    }

    comp.remove();
    app.endUndoGroup();

    var f = new File(OUT);
    f.encoding = "UTF-8";
    f.open("w");
    f.write(JSON.stringify(catalog, null, 2));
    f.close();
    return "CATALOG_OK:" + catalog.effects.length;
})();
```

نکته‌ی نسخه‌ای: در AE های 24.0+ شیء `app.effects` همان رفتار Legacy را دارد، اما
همیشه پس از نصب/حذف پلاگین، کاتالوگ باید **regenerate** شود (Node این را از
تاریخ‌چة `Plugins` در Receipt تشخیص می‌دهد).

## ۲.۲ Introspection عمق پراپرتی‌ها

برای Debug و ساخت Preset، یک Endpoint فقط یک افکت خاص از یک لایه‌ی واقعی را
عمیق اسکن می‌کند:

```javascript
// introspectEffect.jsx — اسکن عمیق یک افکت موجود روی یک لایه
function introspectEffect(layer, effectMatchName) {
    var fx = null;
    for (var i = 1; i <= layer("Effects").numProperties; i++) {
        var e = layer("Effects").property(i);
        if (e.matchName === effectMatchName) { fx = e; break; }
    }
    if (!fx) throw new Error("EFFECT_NOT_FOUND:" + effectMatchName);

    function node(p, depth) {
        var out = {
            matchName: p.matchName,
            displayName: p.name,
            propertyType: String(p.propertyType).replace("PropertyType.", ""),
            propertyValueType: String(p.propertyValueType).replace("PropertyValueType.", ""),
            numKeys: 0
        };
        try { out.numKeys = p.numKeys; } catch (e) {}
        if (p.propertyType === PropertyType.PROPERTY) {
            try { out.value = p.value; } catch (e) {}
            try {
                if (p.hasMin) out.min = p.minimumValue;
                if (p.hasMax) out.max = p.maximumValue;
            } catch (e) {}
            try {
                if (p.numKeys > 0) {
                    out.keyframes = [];
                    for (var k = 1; k <= p.numKeys; k++) {
                        out.keyframes.push({
                            time: p.keyTime(k),
                            value: p.keyValue(k),
                            interpIn:  String(p.keyInInterpolationType(k)).replace("KeyframeInterpolationType.", ""),
                            interpOut: String(p.keyOutInterpolationType(k)).replace("KeyframeInterpolationType.", "")
                        });
                    }
                }
            } catch (e) {}
        } else {
            out.params = [];
            for (var j = 1; j <= p.numProperties; j++) out.params.push(node(p.property(j), depth + 1));
        }
        return out;
    }
    return node(fx, 0);
}
```

## ۲.۳ اسکیمای `effects-catalog.json`

```json
{
  "schema": "omega.effects-catalog/1.5",
  "generatedAt": "2025-01-15T10:22:31Z",
  "aeVersion": "24.6.3",
  "locale": "en_US",
  "effects": [
    {
      "matchName": "CC Particle World",
      "displayName": "CC Particle World",
      "category": "Simulation",
      "versionHint": null,
      "installed": true,
      "params": [
        { "matchName": "ADBE Camera Lens Blur-0001", "displayName": "Blob Birth Size",
          "dataType": "Slider", "min": 0, "max": 100, "default": 0.3 },
        { "matchName": "ADBE Camera Lens Blur-0002", "displayName": "Velocity",
          "dataType": "Slider", "min": 0, "max": 5, "default": 0.6 },
        { "matchName": "ADBE Camera Lens Blur-0003", "displayName": "Gravity",
          "dataType": "Slider", "min": -2, "max": 2, "default": 0.1 },
        { "matchName": "ADBE Camera Lens Blur-0004", "displayName": "Particle",
          "dataType": "NAMED_GROUP",
          "params": [
            { "matchName": "ADBE Camera Lens Blur-0005", "displayName": "Birth Color",
              "dataType": "COLOR", "min": null, "max": null, "default": [1, 1, 1] },
            { "matchName": "ADBE Camera Lens Blur-0006", "displayName": "Death Color",
              "dataType": "COLOR", "min": null, "max": null, "default": [0.2, 0.2, 0.2] }
          ]
        }
      ]
    },
    {
      "matchName": "Trapcode Particular",
      "displayName": "Trapcode Particular",
      "category": "Simulation",
      "versionHint": "6.1.0",
      "installed": true,
      "params": [
        { "matchName": "TP Particular/Emission", "displayName": "Emitter",
          "dataType": "NAMED_GROUP",
          "params": [
            { "matchName": "TP Particular/Emission/Particles/sec", "displayName": "Particles/sec",
              "dataType": "Slider", "min": 0, "max": 100000, "default": 100 }
          ]
        }
      ]
    }
  ]
}
```

# ۳. لایه انتزاع افکت‌ها و پریست‌ها (FX & Preset Abstraction Layer)

## ۳.۱ Manifest JSON Schema

مانیفست (Stage Manifest) زبان مشترک مهندسی است: یک فایل JSON مستقل از ماشین
که تعریف می‌کند چه زنجیره‌ای از افکت‌ها روی یک کامپوزیشن یا لایه‌ها اعمال شوند.
سطوح پشتیبانی‌شده:
- `TARGET_COMP`: افکت روی کل کامپوزیشن (اضافه کردن خودکار یک Master Adjustment Layer).
- `TARGET_LAYER`: افکت روی یک لایه‌ی صریح (بر اساس نام یا اندیس).
- `TARGET_NEW_SOLID`: ساخت یک Solid مستقل، اعمال افکت (الگوی Element 3D / Particular).
- `TARGET_ADJUSTMENT`: ساخت Adjustment Layer جدید در بالای استک.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OmegaFXManifestStage",
  "type": "object",
  "required": ["version", "stageId", "target", "operations"],
  "properties": {
    "version": { "type": "string", "const": "1.5" },
    "stageId": { "type": "string", "pattern": "^[a-z0-9_-]+$" },
    "target": {
      "type": "object",
      "required": ["scope"],
      "properties": {
        "scope": { "type": "string", "enum": ["COMP", "LAYER", "NEW_SOLID", "NEW_ADJUSTMENT"] },
        "compName": { "type": "string" },
        "layerName": { "type": "string" },
        "layerIndex": { "type": "integer", "minimum": 1 },
        "solidColor": { "type": "array", "items": { "type": "number", "minimum": 0, "maximum": 1 }, "minItems": 3, "maxItems": 3 }
      }
    },
    "operations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["op"],
        "properties": {
          "op": { "type": "string", "enum": ["APPLY_MATCHNAME", "APPLY_PRESET", "SET_VALUE", "SET_KEYFRAMES", "SET_EXPRESSION"] },
          "matchName": { "type": "string" },
          "presetPath": { "type": "string" },
          "fallbackMatchNames": { "type": "array", "items": { "type": "string" } },
          "propPath": { "type": "array", "items": { "type": "string" } },
          "value": {},
          "time": { "type": "number", "minimum": 0 },
          "expression": { "type": "string" },
          "keyframes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["time", "value"],
              "properties": {
                "time": { "type": "number" },
                "value": {},
                "easeIn": { "$ref": "#/$defs/ease" },
                "easeOut": { "$ref": "#/$defs/ease" },
                "interp": { "type": "string", "enum": ["LINEAR", "BEZIER", "HOLD"] }
              }
            }
          }
        }
      }
    }
  },
  "$defs": {
    "ease": {
      "type": "object",
      "properties": {
        "speed": { "type": "number" },
        "influence": { "type": "number", "minimum": 0.1, "maximum": 100 }
      }
    }
  }
}
```

## ۳.۲ لود پریست .ffx و Override پارامترها

استراتژی اعمال پریست:
1. اعمال پریست استاندارد AE با متد `layer.applyPreset(File(ffxPath))`.
2. استخراج ساختار جدید از لایه.
3. بازنویسی (Override) تک‌تک پارامترهای هدف بر اساس `propPath` با `setValue` یا `setValueAtTime`.

کد ExtendScript هسته‌ی اعمال پریست با قابلیت Override:

```javascript
// applyPresetAndOverride.jsx
function applyPresetAndOverride(layer, ffxAbsPath, overrides) {
    // 1. بررسی وجود فایل
    var ffx = new File(ffxAbsPath);
    if (!ffx.exists) throw new Error("FFX_NOT_FOUND:" + ffxAbsPath);

    // شمارش تعداد افکت‌ها قبل از اعمال برای پیدا کردن دقیق افکت‌های تازه‌وارد
    var prevCount = layer("Effects").numProperties;

    // 2. اعمال پریست
    layer.applyPreset(ffx);

    // 3. اعمال Overrides
    // overrides: [ { effectIndexOrName: 1, propPath: ["Color"], value: [1,0,0] }, ... ]
    for (var i = 0; i < overrides.length; i++) {
        var ov = overrides[i];
        var fx = null;
        if (typeof ov.effectRef === "number") {
            fx = layer("Effects").property(ov.effectRef);
        } else {
            // جستجو بر اساس matchName یا نام
            for (var k = 1; k <= layer("Effects").numProperties; k++) {
                var cand = layer("Effects").property(k);
                if (cand.matchName === ov.effectRef || cand.name === ov.effectRef) {
                    fx = cand; break;
                }
            }
        }
        if (!fx) throw new Error("OVERRIDE_FX_NOT_FOUND:" + ov.effectRef);

        var p = fx;
        for (var j = 0; j < ov.propPath.length; j++) {
            p = p.property(ov.propPath[j]);
            if (!p) throw new Error("OVERRIDE_PROP_NOT_FOUND:" + ov.propPath.slice(0, j + 1).join("/"));
        }

        if (ov.expression) {
            p.expression = ov.expression;
        } else if (ov.keyframes && ov.keyframes.length > 0) {
            for (var m = 0; m < ov.keyframes.length; m++) {
                var kf = ov.keyframes[m];
                p.setValueAtTime(kf.time, kf.value);
            }
        } else {
            p.setValue(ov.value);
        }
    }
}
```

## ۳.۳ دسته‌بندی ماژولار

دسته‌بندی ماژولار افکت‌ها در پنج شاخه‌ی اصلی با استراتژی Composition:

| دسته (Category) | نمونه‌های Third-Party | نمونه‌های Native معادل | کاربرد در کامپوزیت |
|---|---|---|---|
| **Color Correction** | Magic Bullet Looks, Boris FX Film Stocks | Lumetri Color, Curves, Levels, Tint | گرید رنگی نهایی، Balance نور و مشکی‌ها |
| **Particles** | Trapcode Particular, Form, Stardust | CC Particle World, Particle Playground | دود، آتش، پارتیکل معلق، شبیه‌سازی فیزیکی |
| **Distortion / Stylize** | Boris FX BCC Warp, Sapphire Dissolve | Displacement Map, CC Lens, Turbulent Displace | شکست نور، موج گرما، اعوجاج لنز، گلیچ |
| **Generators** | Optical Flares, Boris FX Light Wrap | CC Light Rays, Lens Flare, Fractal Noise | لنز فلر، پس‌زمینه پویا، مپ فوتومتریک |
| **3D / Compositing** | Video Copilot Element 3D, Cineware | AE 3D Layers, Extruded Text, Classic 3D | ورود مدل سه‌بعدی، سایه‌زنی عمق، یکپارچه‌سازی با دوربین |

## ۳.۴ Pipeline اجرای Stage ها

ترکیب کد Node.js برای آماده‌سازی Stage و اجرای آن توسط Host Runner در ExtendScript:

### لایه‌ی Node.js (Stage Orchestration)

```typescript
// src/fx-engine/stage-runner.ts
import { BridgeClient } from "../bridge/bridge-client";
import { ManifestValidator } from "./manifest-validator";
import { FallbackResolver } from "./fallback-resolver";

export interface StageManifest {
  version: "1.5";
  stageId: string;
  target: {
    scope: "COMP" | "LAYER" | "NEW_SOLID" | "NEW_ADJUSTMENT";
    compName?: string;
    layerName?: string;
    layerIndex?: number;
    solidColor?: [number, number, number];
  };
  operations: Array<{
    op: "APPLY_MATCHNAME" | "APPLY_PRESET" | "SET_VALUE" | "SET_KEYFRAMES" | "SET_EXPRESSION";
    matchName?: string;
    presetPath?: string;
    fallbackMatchNames?: string[];
    propPath?: string[];
    value?: any;
    time?: number;
    expression?: string;
    keyframes?: Array<{ time: number; value: any; easeIn?: any; easeOut?: any }>;
  }>;
}

export class StageRunner {
  constructor(
    private bridge: BridgeClient,
    private validator: ManifestValidator,
    private fallback: FallbackResolver
  ) {}

  async executeStage(rawManifest: StageManifest): Promise<{ success: boolean; appliedOps: number; receiptId: string }> {
    // 1. اعتبارسنجی اسکیمای مانیفست
    this.validator.validate(rawManifest);

    // 2. اعمال استراتژی Fallback بر روی عملیات‌های مانیفست
    const resolvedManifest = this.fallback.resolve(rawManifest);

    // 3. ارسال به Bridge Inbox
    const receipt = await this.bridge.dispatchJob({
      command: "APPLY_STAGE",
      payload: resolvedManifest,
      timeoutMs: 90000
    });

    if (receipt.status !== "SUCCESS") {
      throw new Error(`STAGE_FAILED: ${receipt.error?.code} - ${receipt.error?.message}`);
    }

    return {
      success: true,
      appliedOps: receipt.result?.appliedOps ?? 0,
      receiptId: receipt.jobId
    };
  }
}
```

### لایه‌ی ExtendScript (Host Pipeline)

```javascript
// scripts/fx/apply-stage-host.jsx
function applyStagePipeline(stageData) {
    app.beginUndoGroup("OMEGA Stage: " + stageData.stageId);
    var appliedCount = 0;
    try {
        // ۱. یافتن کامپوزیشن
        var comp = null;
        var compName = stageData.target.compName;
        if (compName) {
            for (var i = 1; i <= app.project.items.length; i++) {
                if (app.project.items[i] instanceof CompItem && app.project.items[i].name === compName) {
                    comp = app.project.items[i];
                    break;
                }
            }
        }
        if (!comp) comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) throw new Error("NO_VALID_COMP_FOUND");

        // ۲. انتخاب یا ساخت لایه بر اساس Scope
        var layer = null;
        var scope = stageData.target.scope;
        if (scope === "COMP" || scope === "NEW_ADJUSTMENT") {
            layer = comp.layers.addSolid([1,1,1], "FX_" + stageData.stageId, comp.width, comp.height, comp.pixelAspect, comp.duration);
            layer.adjustmentLayer = true;
        } else if (scope === "NEW_SOLID") {
            var col = stageData.target.solidColor || [0,0,0];
            layer = comp.layers.addSolid(col, "SOLID_" + stageData.stageId, comp.width, comp.height, comp.pixelAspect, comp.duration);
        } else if (scope === "LAYER") {
            if (stageData.target.layerName) {
                layer = comp.layers.byName(stageData.target.layerName);
            } else if (stageData.target.layerIndex) {
                layer = comp.layers[stageData.target.layerIndex];
            }
        }
        if (!layer) throw new Error("LAYER_TARGET_UNRESOLVED");

        // ۳. اجرای Operations
        var lastEffect = null;
        for (var opIdx = 0; opIdx < stageData.operations.length; opIdx++) {
            var op = stageData.operations[opIdx];
            if (op.op === "APPLY_MATCHNAME") {
                lastEffect = layer("Effects").addProperty(op.matchName);
                appliedCount++;
            } else if (op.op === "APPLY_PRESET") {
                layer.applyPreset(new File(op.presetPath));
                lastEffect = layer("Effects").property(layer("Effects").numProperties);
                appliedCount++;
            } else if (op.op === "SET_VALUE") {
                var pVal = resolveProp(lastEffect || layer, op.propPath);
                if (op.time !== undefined) {
                    pVal.setValueAtTime(op.time, op.value);
                } else {
                    pVal.setValue(op.value);
                }
                appliedCount++;
            } else if (op.op === "SET_EXPRESSION") {
                var pExp = resolveProp(lastEffect || layer, op.propPath);
                pExp.expression = op.expression;
                appliedCount++;
            }
        }

        app.endUndoGroup();
        return { status: "SUCCESS", appliedOps: appliedCount };
    } catch (err) {
        app.endUndoGroup();
        throw err;
    }
}
```

# ۴. موتور قواعد تخصصی موشن و کامپوزیت (Motion Intelligence & Design Rules)

## ۴.۱ اتوماسیون کی‌فریم و Easing

یک کامپوزیتور ارشد هیچ‌گاه کی‌فریم خطی (Linear) رها نمی‌کند. موتور Motion Intelligence
قواعد حرکت طبیعی را از طریق اشیاء `KeyframeEase` در ExtendScript تزریق می‌کند:

- **Speed**: شیب اولیه‌ی ورود یا خروج مقدار (واحدهای مقدار بر ثانیه).
- **Influence**: وزن انحنای بزیه (درصد از ۰.۱ تا ۱۰۰٪).
- استاندارد **Smooth-Ease**: `influence = 65%`, `speed = 0`.
- استاندارد **Snap-Punch**: `easeIn: influence 85%, speed 0` | `easeOut: influence 25%, speed 0`.

کد اتوماسیون کامل کی‌فریم‌ها:

```javascript
// scripts/fx/motion-ease.jsx
function applyAdvancedEasing(property, keyIndex, inSpeed, inInfluence, outSpeed, outInfluence) {
    // اعتبارسنجی محدوده‌ها
    inInfluence  = Math.max(0.1, Math.min(100, inInfluence));
    outInfluence = Math.max(0.1, Math.min(100, outInfluence));

    // تشخیص ابعاد پراپرتی: 1D, 2D, 3D
    var valType = property.propertyValueType;
    var easeInArray = [];
    var easeOutArray = [];

    if (valType === PropertyValueType.TwoD_SPATIAL || valType === PropertyValueType.TwoD) {
        var eIn1 = new KeyframeEase(inSpeed, inInfluence);
        var eIn2 = new KeyframeEase(inSpeed, inInfluence);
        var eOut1 = new KeyframeEase(outSpeed, outInfluence);
        var eOut2 = new KeyframeEase(outSpeed, outInfluence);
        property.setTemporalEaseAtKey(keyIndex, [eIn1, eIn2], [eOut1, eOut2]);
    } else if (valType === PropertyValueType.ThreeD_SPATIAL || valType === PropertyValueType.ThreeD) {
        var e1 = new KeyframeEase(inSpeed, inInfluence);
        var e2 = new KeyframeEase(inSpeed, inInfluence);
        var e3 = new KeyframeEase(inSpeed, inInfluence);
        var o1 = new KeyframeEase(outSpeed, outInfluence);
        var o2 = new KeyframeEase(outSpeed, outInfluence);
        var o3 = new KeyframeEase(outSpeed, outInfluence);
        property.setTemporalEaseAtKey(keyIndex, [e1, e2, e3], [o1, o2, o3]);
    } else {
        // حالت ۱ بعدی (اسلایدر، چرخش، شفافیت و...)
        var singleIn = new KeyframeEase(inSpeed, inInfluence);
        var singleOut = new KeyframeEase(outSpeed, outInfluence);
        property.setTemporalEaseAtKey(keyIndex, [singleIn], [singleOut]);
    }

    // تنظیم اینترپولاسیون به بزیه
    property.setInterpolationTypeAtKey(
        keyIndex,
        KeyframeInterpolationType.BEZIER,
        KeyframeInterpolationType.BEZIER
    );
}

// اتوماسیون تزریق چندتایی کی‌فریم همراه با Ease
function automateKeyframeTrack(property, keyDefinitions) {
    // keyDefinitions: [ { time: 0.0, value: 0, inInf: 33, outInf: 75 }, ... ]
    for (var i = 0; i < keyDefinitions.length; i++) {
        var kd = keyDefinitions[i];
        property.setValueAtTime(kd.time, kd.value);
    }
    // Easing باید بعد از ثبت مقادیر اعمال شود چون ایندکس‌ها مرتب می‌شوند
    for (var k = 1; k <= property.numKeys; k++) {
        var matchDef = keyDefinitions[k - 1];
        if (matchDef) {
            applyAdvancedEasing(
                property,
                k,
                matchDef.inSpeed || 0,
                matchDef.inInf || 65,
                matchDef.outSpeed || 0,
                matchDef.outInf || 65
            );
        }
    }
}
```

## ۴.۲ تزریق Expression های هوشمند

تزریق الگوهای اکسپرشن ریاضیاتی بدون شکستن گرافیک:

```javascript
// scripts/fx/expression-templates.jsx
var ExpressionLibrary = {
    // نوسان نرم فیزیکی بدون برش تیز
    organicWiggle: function(freq, amp, octaves) {
        return "wiggle(" + freq + ", " + amp + ", " + (octaves || 1) + ");";
    },

    // نگاشت خطی نرم با کلمپ (Clamp)
    smoothRemap: function(driverPropRef, inMin, inMax, outMin, outMax) {
        return "var driver = " + driverPropRef + ";
" +
               "ease(driver, " + inMin + ", " + inMax + ", " + outMin + ", " + outMax + ");";
    },

    // دنبال‌کننده تاخیری (Trailing Leader-Follower)
    valueDelay: function(targetLayerName, propName, delaySeconds) {
        return "var leader = thisComp.layer('" + targetLayerName + "');
" +
               "leader." + propName + ".valueAtTime(time - " + delaySeconds + ");";
    },

    // چرخش خودکار سه‌بعدی به سمت هدف (LookAt برای دوربین یا نال سه‌بعدی)
    lookAtTarget: function(targetLayerName) {
        return "var target = thisComp.layer('" + targetLayerName + "');
" +
               "lookAt(target.toWorld([0,0,0]), toWorld(anchorPoint));";
    }
};

// متد اعمال اکسپرشن همراه با Guard برای جلوگیری از غیرفعال شدن (Disable) توسط AE
function injectSafeExpression(property, exprString) {
    property.expression = exprString;
    if (property.expressionError && property.expressionError.length > 0) {
        var err = property.expressionError;
        property.expression = ""; // پاکسازی خطا برای جلوگیری از مسدود شدن لایه
        throw new Error("EXPRESSION_ERROR: " + err);
    }
}
```

## ۴.۳ مدیریت فضاهای رنگی (Color Management / OCIO / ACES)

رعایت استاندارد کامپوزیت سینمایی در سطح پروژه با تنظیم عمق بیت (Bit Depth) و فضای کاری OCIO:

```javascript
// scripts/fx/color-management.jsx
function setupLinearACESProject(project, ocioConfigAbsPath) {
    app.beginUndoGroup("OMEGA Setup Color Space");

    // تنظیم عمق بیت به 32-bit Float برای پرهیز از قطع شدن هایلایت‌ها در پارتیکل‌ها و گلو
    project.bitsPerChannel = ChannelDepth.FLOAT32;

    // انتخاب سیستم رنگ: OCIO یا Adobe Color Managed
    if (ocioConfigAbsPath && File(ocioConfigAbsPath).exists) {
        // در AE های نسخه 23+ OpenColorIO مستقیماً پشتیبانی می‌شود
        try {
            project.colorManagementType = ColorManagementType.OCIO;
            project.setOCIOConfiguration(new File(ocioConfigAbsPath));
            project.workingSpace = "ACES - ACEScg";
        } catch (e) {
            // در صورت عدم پشتیبانی از API نیتیو OCIO در نسخه جاری، fallback به sRGB Linear
            project.workingSpace = "sRGB IEC61966-2.1";
            project.linearizeWorkingSpace = true;
        }
    } else {
        // تنظیم استاندارد Linear sRGB
        project.workingSpace = "sRGB IEC61966-2.1";
        project.linearizeWorkingSpace = true; // فعال‌سازی Linear Blend
    }

    // تصحیح نسبت روشنایی صحنه (Comp Display Color Management)
    project.compensateForSceneReferredProfiles = true;

    app.endUndoGroup();
    return {
        bitsPerChannel: "32bpc",
        workingSpace: project.workingSpace,
        linearized: project.linearizeWorkingSpace
    };
}
```

## ۴.۴ Track Mattes

تنظیم سیستم مات‌های ترکیبی سازگار با AE نسخه جدید (v23+ که از ارجاع مستقیم به هر لایه پشتیبانی می‌کند) و نسخه‌های قبل:

```javascript
// scripts/fx/track-matte.jsx
function assignTrackMatte(targetLayer, matteLayer, matteTypeStr) {
    // matteTypeStr: "ALPHA", "ALPHA_INVERTED", "LUMA", "LUMA_INVERTED", "NONE"
    
    // تشخیص نسخه AE: در نسخه‌های 23 به بعد تابع setTrackMatte استفاده می‌شود
    var aeVer = parseFloat(app.version);
    
    if (aeVer >= 23.0 && typeof targetLayer.setTrackMatte === "function") {
        var mt = TrackMatteType.NO_TRACK_MATTE;
        if (matteTypeStr === "ALPHA") mt = TrackMatteType.ALPHA;
        else if (matteTypeStr === "ALPHA_INVERTED") mt = TrackMatteType.ALPHA_INVERTED;
        else if (matteTypeStr === "LUMA") mt = TrackMatteType.LUMA;
        else if (matteTypeStr === "LUMA_INVERTED") mt = TrackMatteType.LUMA_INVERTED;
        
        targetLayer.setTrackMatte(matteLayer, mt);
    } else {
        // رفتار Legacy: لایه مات باید دقیقاً بالای لایه هدف در استک لایه‌ها باشد
        if (matteLayer.index !== targetLayer.index - 1) {
            matteLayer.moveBefore(targetLayer);
        }
        var legMatte = TrackMatteType.NO_TRACK_MATTE;
        if (matteTypeStr === "ALPHA") legMatte = TrackMatteType.ALPHA;
        else if (matteTypeStr === "ALPHA_INVERTED") legMatte = TrackMatteType.ALPHA_INVERTED;
        else if (matteTypeStr === "LUMA") legMatte = TrackMatteType.LUMA;
        else if (matteTypeStr === "LUMA_INVERTED") legMatte = TrackMatteType.LUMA_INVERTED;
        
        targetLayer.trackMatteType = legMatte;
    }
}
```

---

# ۵. پایداری، اعتبارسنجی و مدیریت خطا (Resilience, Validation & Fallback)

## ۵.۱ پیش‌اعتبارسنجی مانیفست‌ها قبل از ارسال به بریج

قبل از نوشتن هر فایل روی دیسک بریج، کلاینت Node.js تمام مانیفست‌ها را از لحاظ وجود پلاگین بر اساس
`effects-catalog.json` بازبینی می‌کند. اگر افکت ناشناخته باشد و هیچ Fallback مشخصی نداشته باشد، قبل
از مصرف زمان افتر افکت، بلافاصله Reject می‌شود.

```typescript
// src/fx-engine/manifest-validator.ts
import { CatalogService } from "../fx-catalog/catalog-service";

export interface ValidationResult {
  valid: boolean;
  missingPlugins: string[];
  warnings: string[];
}

export class ManifestValidator {
  constructor(private catalog: CatalogService) {}

  public validate(manifest: any): ValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!manifest.stageId || !manifest.operations || !Array.isArray(manifest.operations)) {
      throw new Error("SCHEMA_ERROR: Manifest missing stageId or operations array");
    }

    for (const op of manifest.operations) {
      if (op.op === "APPLY_MATCHNAME") {
        const isInstalled = this.catalog.hasEffect(op.matchName);
        if (!isInstalled) {
          if (op.fallbackMatchNames && op.fallbackMatchNames.length > 0) {
            warnings.push(`Missing [${op.matchName}] - fallback chain defined: ${op.fallbackMatchNames.join(" -> ")}`);
          } else {
            missing.push(op.matchName);
          }
        }
      }
    }

    return {
      valid: missing.length === 0,
      missingPlugins: missing,
      warnings
    };
  }
}
```

## ۵.۲ جدول استراتژی Fallback خودکار

| ردیف | افکت درخواست شده (Third-Party) | افکت جایگزین اول (Native Preferred) | افکت جایگزین دوم (Secondary) | پارامترهای نگاشت شده (Key Mappings) |
|---|---|---|---|---|
| ۱ | **Trapcode Particular** (`TP Particular`) | `CC Particle World` (`ADBE CC Particle World`) | `Particle Playground` | Emitter Pos -> Position, Birth Rate -> Birth Rate, Gravity -> Gravity |
| ۲ | **Optical Flares** (`VC Optical Flares`) | `Lens Flare` (`ADBE Lens Flare`) | `CC Light Rays` | Flare Center -> Flare Center, Brightness -> Flare Brightness |
| ۳ | **Element 3D** (`VC Element 3D`) | `AE Built-in 3D Extrusion` + Shadow Catcher | `Classic 3D Pre-render Stack` | World Transform -> 3D Layer Transform, Camera Link |
| ۴ | **Boris FX Continuum Warp** (`BCC Warp`) | `Displacement Map` (`ADBE Displacement Map`) | `Turbulent Displace` (`ADBE Turbulent Displace`) | Warp Amount -> Max Horizontal/Vertical Displacement |
| ۵ | **Deep Glow** (`Deep Glow`) | `Glow` (`ADBE Glow`) با استک ۲تایی لایه | `Gaussian Blur` با Blend Mode Add | Glow Radius, Glow Intensity, Threshold, Additive Blend |
| ۶ | **RSMB (ReelSmart Motion Blur)** (`RSMB`) | `Pixel Motion Blur` (`ADBE Pixel Motion Blur`) | `CC Force Motion Blur` | Shutter Angle -> Shutter Angle, Motion Sensitivity |

پیاده‌سازی Fallback Resolver در Node.js:

```typescript
// src/fx-engine/fallback-resolver.ts
import { CatalogService } from "../fx-catalog/catalog-service";

export const DEFAULT_FALLBACK_TABLE: Record<string, string[]> = {
  "Trapcode Particular": ["CC Particle World", "Particle Playground"],
  "VC Optical Flares": ["ADBE Lens Flare", "CC Light Rays"],
  "VC Element 3D": ["ADBE Geometry Options"],
  "Deep Glow": ["ADBE Glow"],
  "RSMB": ["ADBE Pixel Motion Blur", "CC Force Motion Blur"],
  "BCC Warp": ["ADBE Displacement Map", "ADBE Turbulent Displace"]
};

export class FallbackResolver {
  constructor(private catalog: CatalogService, private customTable?: Record<string, string[]>) {}

  public resolve(manifest: any): any {
    const table = { ...DEFAULT_FALLBACK_TABLE, ...this.customTable };
    const cloned = JSON.parse(JSON.stringify(manifest));

    for (const op of cloned.operations) {
      if (op.op === "APPLY_MATCHNAME" && !this.catalog.hasEffect(op.matchName)) {
        const fallbacks = op.fallbackMatchNames || table[op.matchName] || [];
        const found = fallbacks.find((fb: string) => this.catalog.hasEffect(fb));
        if (found) {
          op._originalMatchName = op.matchName;
          op.matchName = found;
          op._fallbackApplied = true;
        } else {
          throw new Error(`CRITICAL_MISSING_PLUGIN: [${op.matchName}] and no installed fallbacks found.`);
        }
      }
    }
    return cloned;
  }
}
```

## ۵.۳ مدیریت خطاهای سطح اسکریپت و بازیابی پایداری (Undo Safety)

برای جلوگیری از فریز شدن After Effects، هر درخواست با بلوک‌های حفاظتی احاطه شده و
در صورت خطا، تغییرات با Undo پاک‌سازی و وضعیت در دیسک به صورت خطای شفاف گزارش می‌شود:

```javascript
// scripts/fx/safe-executor.jsx
function executeJobSafely(jobData, jobCallback) {
    var receipt = {
        jobId: jobData.jobId,
        status: "FAILED",
        startTime: (new Date()).toISOString(),
        endTime: null,
        error: null,
        result: null
    };

    var undoGroupName = "OMEGA_" + jobData.jobId;
    app.beginUndoGroup(undoGroupName);

    try {
        // اجرای عملیات واقعی
        var res = jobCallback(jobData.payload);
        receipt.result = res;
        receipt.status = "SUCCESS";
        app.endUndoGroup();
    } catch (e) {
        app.endUndoGroup();
        // Rollback فوری برای اینکه کامپوزیشن در وضعیت خراب نماند
        try {
            app.executeCommand(16); // Undo Command ID در AE
        } catch (undoErr) {
            // در صورت بروز خطا در Undo
        }

        receipt.error = {
            code: "HOST_EXEC_ERROR",
            message: String(e.message || e),
            line: e.line || null,
            fileName: e.fileName || null,
            stack: $.stack || null
        };
    } finally {
        receipt.endTime = (new Date()).toISOString();
    }

    return receipt;
}
```

## ۵.۴ مکانیزم Watchdog و رسید کارها (Job Receipts)

در لایه‌ی Node.js، سیستم نظارتی Watchdog مهلت زمانی مجاز (Timeout) برای هر Job را رصد می‌کند.
اگر فرآیند AE پاسخ ندهد، وضعیت Process بازرسی و در صورت فریز، ریکاوری انجام می‌گیرد:

```typescript
// src/bridge/watchdog.ts
import * as fs from "fs";
import * as path from "path";

export interface JobReceipt {
  jobId: string;
  status: "SUCCESS" | "FAILED" | "TIMEOUT";
  startTime: string;
  endTime: string;
  result?: any;
  error?: { code: string; message: string; stack?: string };
}

export async function waitForReceipt(
  outboxDir: string,
  jobId: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 250
): Promise<JobReceipt> {
  const receiptFile = path.join(outboxDir, `receipt-${jobId}.json`);
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (fs.existsSync(receiptFile)) {
        clearInterval(timer);
        try {
          const raw = fs.readFileSync(receiptFile, "utf-8");
          const receipt: JobReceipt = JSON.parse(raw);
          // حذف فایل رسید پس از دریافت موفق برای تمیز نگه داشتن Outbox
          fs.unlinkSync(receiptFile);
          resolve(receipt);
        } catch (e) {
          reject(new Error(`CORRUPTED_RECEIPT_FILE: ${(e as Error).message}`));
        }
      } else if (Date.now() > deadline) {
        clearInterval(timer);
        resolve({
          jobId,
          status: "TIMEOUT",
          startTime: new Date(deadline - timeoutMs).toISOString(),
          endTime: new Date().toISOString(),
          error: {
            code: "WATCHDOG_TIMEOUT",
            message: `AE Bridge did not respond within ${timeoutMs}ms.`
          }
        });
      }
    }, pollIntervalMs);
  });
}
```


---

# ۶. ساختار پوشه‌ها و قراردادهای کد (Repository Directory Structure & Interface Signatures)

## ۶.۱ درخت پوشه‌ها

ساختار پیشنهادی برای الحاق مستقیم به Repository پروژه در Visual Studio / VS Code:

```text
AE_BOSS_OMEGA_Foundation_v155/
├── package.json
├── tsconfig.json
├── README.md
├── .env.example
├── config/
│   ├── ae-host.json                 # مسیر AE executable و نسخه مجاز
│   ├── bridge.json                  # مسیر Inbox/Outbox، timeout و polling
│   └── ocio/
│       ├── config.ocio
│       └── looks/
├── src/
│   ├── index.ts
│   ├── fx-catalog/
│   │   ├── catalog-service.ts       # load, cache و lookup بر اساس matchName
│   │   ├── catalog-schema.ts        # JSON Schema و TypeScript types
│   │   ├── catalog-generator.ts    # درخواست اسکن به JSX
│   │   └── effects-catalog.json     # کپی snapshot ماشین build/target
│   ├── fx-engine/
│   │   ├── fx-engine.ts             # اجرای pipeline اصلی
│   │   ├── stage-runner.ts
│   │   ├── manifest-validator.ts
│   │   ├── fallback-resolver.ts
│   │   ├── preset-service.ts
│   │   ├── motion-rules.ts
│   │   └── color-manager.ts
│   ├── bridge/
│   │   ├── bridge-client.ts         # write inbox, poll outbox
│   │   ├── protocol.ts              # command/receipt contracts
│   │   ├── watchdog.ts
│   │   ├── atomic-file.ts           # temp + rename و lock
│   │   └── ae-process.ts            # lifecycle و health check
│   └── render/
│       ├── render-orchestrator.ts
│       └── receipt-parser.ts
├── scripts/
│   ├── fx/
│   │   ├── host-runner.jsx          # entrypoint با runCommand
│   │   ├── introspect-effect.jsx
│   │   ├── apply-stage-host.jsx
│   │   ├── motion-ease.jsx
│   │   ├── color-management.jsx
│   │   ├── track-matte.jsx
│   │   └── safe-executor.jsx
│   └── bootstrap/
│       └── install-runner.jsx
├── presets/
│   ├── color/
│   ├── particles/
│   ├── distortion/
│   ├── generators/
│   └── 3d/
├── manifests/
│   ├── samples/
│   ├── production/
│   └── schema/omega-stage.schema.json
├── tests/
│   ├── unit/
│   │   ├── manifest-validator.spec.ts
│   │   ├── fallback-resolver.spec.ts
│   │   └── catalog-service.spec.ts
│   ├── integration/
│   │   └── bridge-client.spec.ts
│   ├── e2e/
│   │   ├── heavy-composition.spec.ts
│   │   └── fixtures/
│   └── fixtures/
│       ├── catalogs/
│       └── manifests/
├── receipts/
│   ├── .gitkeep
│   ├── archive/
│   └── failed/
├── inbox/                            # runtime فقط؛ در Git ignore
├── outbox/                           # runtime فقط؛ در Git ignore
└── logs/
    ├── bridge/
    └── ae/
```

قرارداد عملیاتی Bridge:

```json
{
  "protocolVersion": "1.5",
  "jobId": "job_20250115_102231_8f31",
  "command": "APPLY_STAGE",
  "createdAt": "2025-01-15T10:22:31.000Z",
  "timeoutMs": 90000,
  "payload": { "stageId": "hero_particles", "target": { "scope": "NEW_ADJUSTMENT" }, "operations": [] }
}
```

قواعد فایل‌سیستم: Node ابتدا `job-id.tmp.json` می‌نویسد، `fsync` می‌کند و سپس
به `job-id.request.json` rename اتمیک می‌کند؛ JSX فقط فایل کامل با پسوند
`.request.json` را می‌خواند. Lock فایل (`job-id.lock`) مانع اجرای دوباره‌ی یک Job است.

## ۶.۲ اینترفیس‌های Node.js

امضاهای زیر Contract سطح کد هستند؛ implementation می‌تواند class یا dependency-injected adapter باشد:

```typescript
// src/fx-engine/contracts.ts
export interface EffectCatalogEntry {
  matchName: string;
  displayName: string;
  category: string;
  versionHint: string | null;
  installed: boolean;
  params: Array<{ matchName: string; displayName: string; dataType: string; min: number | null; max: number | null; default: unknown }>;
}

export interface BridgeReceipt {
  jobId: string;
  status: "SUCCESS" | "FAILED" | "TIMEOUT";
  renderTime?: number;
  outputFile?: string;
  md5?: string;
  result?: unknown;
  error?: { code: string; message: string; stack?: string };
}

/** CatalogService: تنها منبع lookup افکت‌های نصب‌شده. */
export class CatalogService {
  /** بارگذاری و schema-validation فایل effects-catalog.json. */
  loadCatalog(filePath: string): Promise<void>;
  /** Lookup فقط با matchName؛ displayName عمداً پشتیبانی نمی‌شود. */
  hasEffect(matchName: string): boolean;
  getEffect(matchName: string): EffectCatalogEntry | undefined;
  listByCategory(category: string): EffectCatalogEntry[];
  getGeneratedAt(): string;
}

/** BridgeClient: انتقال فایل‌محور و دریافت Receipt با Watchdog. */
export class BridgeClient {
  dispatchJob(request: {
    command: string;
    payload: unknown;
    timeoutMs?: number;
  }): Promise<BridgeReceipt>;
  ping(timeoutMs?: number): Promise<boolean>;
  cancel(jobId: string): Promise<void>;
  getReceipt(jobId: string): Promise<BridgeReceipt | null>;
}

/** ManifestValidator: اجرای JSON Schema و قواعد نصب پلاگین. */
export class ManifestValidator {
  validate(manifest: unknown): { valid: boolean; missingPlugins: string[]; warnings: string[] };
  assertValid(manifest: unknown): void;
  validateOperation(op: unknown, index: number): void;
}

/** FxEngine: orchestrator سطح بالای FX بدون دانستن جزئیات AE DOM. */
export class FxEngine {
  discoverEffects(): Promise<EffectCatalogEntry[]>;
  applyManifest(manifestPathOrObject: string | object): Promise<BridgeReceipt>;
  applyStage(stageId: string, manifest: object): Promise<BridgeReceipt>;
  dryRun(manifest: object): Promise<{ valid: boolean; plannedOperations: number; warnings: string[] }>;
}

/** RenderOrchestrator: ساخت Render Queue و ارزیابی خروجی قابل بازتولید. */
export class RenderOrchestrator {
  render(input: {
    compName: string;
    outputFile: string;
    startFrame?: number;
    endFrame?: number;
    codec?: string;
  }): Promise<BridgeReceipt>;
  verifyOutput(receipt: BridgeReceipt): Promise<{ exists: boolean; md5: string; durationMs: number }>;
  archiveReceipt(receipt: BridgeReceipt, directory: string): Promise<string>;
}
```

## ۶.۳ API عمومی JSX

هر تابع public باید ورودی JSON قابل سریال‌سازی و خروجی JSON قابل ثبت در Receipt داشته باشد:

```javascript
// scripts/fx/host-runner.jsx — Public API Contract
var HostAPI = {
    /** اجرای یک command نسخه‌دار از Node. */
    runCommand: function(commandEnvelope) {
        if (!commandEnvelope || commandEnvelope.protocolVersion !== "1.5") {
            throw new Error("UNSUPPORTED_PROTOCOL");
        }
        if (commandEnvelope.command === "INTROSPECT_EFFECT") {
            return HostAPI.introspectEffect(commandEnvelope.payload);
        }
        if (commandEnvelope.command === "APPLY_STAGE") {
            return HostAPI.applyStage(commandEnvelope.payload);
        }
        if (commandEnvelope.command === "LOAD_CATALOG") {
            return HostAPI.loadCatalog(commandEnvelope.payload);
        }
        if (commandEnvelope.command === "RENDER") {
            return HostAPI.render(commandEnvelope.payload);
        }
        throw new Error("UNKNOWN_COMMAND:" + commandEnvelope.command);
    },

    /** اسکن یک افکت روی لایه با matchName. */
    introspectEffect: function(payload) {
        var comp = app.project.activeItem;
        var layer = comp.layer(payload.layerName || payload.layerIndex);
        return introspectEffect(layer, payload.effectMatchName);
    },

    /** اجرای manifest stage در یک Undo Group ایزوله. */
    applyStage: function(payload) {
        return applyStagePipeline(payload);
    },

    /** بارگذاری Catalog برای استفاده‌ی داخلی Host یا تأیید checksum. */
    loadCatalog: function(payload) {
        var file = new File(payload.filePath);
        if (!file.exists) throw new Error("CATALOG_NOT_FOUND:" + payload.filePath);
        file.open("r");
        var data = JSON.parse(file.read());
        file.close();
        return { status: "CATALOG_LOADED", schema: data.schema, count: data.effects.length };
    },

    /** تنظیم Render Queue، render و تولید metadata خروجی. */
    render: function(payload) {
        var comp = null;
        for (var i = 1; i <= app.project.items.length; i++) {
            if (app.project.items[i] instanceof CompItem && app.project.items[i].name === payload.compName) {
                comp = app.project.items[i]; break;
            }
        }
        if (!comp) throw new Error("COMP_NOT_FOUND:" + payload.compName);
        var rqItem = app.project.renderQueue.items.add(comp);
        rqItem.outputModule(1).file = new File(payload.outputFile);
        var started = new Date().getTime();
        app.project.renderQueue.render();
        return { status: "SUCCESS", outputFile: payload.outputFile, renderTime: new Date().getTime() - started };
    }
};
```

---

# ۷. سناریوهای تستی و مراحل تست پیوسته (E2E Test Scenarios)

## ۷.۱ تست شبیه‌سازی (Dry-Run)

Dry-Run باید تمام تصمیم‌ها را بگیرد اما هیچ تغییری در AE Project ایجاد نکند.
Bridge در این حالت به جای Inbox واقعی یک `MemoryBridge` یا `RecordingBridge`
می‌گیرد و خروجی برنامه‌ریزی‌شده را ذخیره می‌کند.

### Fixture مانیفست

```json
{
  "version": "1.5",
  "stageId": "test_particles_fallback",
  "target": { "scope": "NEW_ADJUSTMENT", "compName": "E2E_Comp" },
  "operations": [
    {
      "op": "APPLY_MATCHNAME",
      "matchName": "Trapcode Particular",
      "fallbackMatchNames": ["CC Particle World", "Particle Playground"]
    },
    {
      "op": "SET_VALUE",
      "propPath": ["Emitter", "Particles/sec"],
      "value": 850
    }
  ]
}
```

### تعریف تست Simulation در TypeScript

```typescript
// tests/unit/fallback-resolver.spec.ts
it("resolves Particular to the first installed native fallback", () => {
  const catalog = new FakeCatalog(["CC Particle World"]);
  const resolver = new FallbackResolver(catalog);
  const manifest = fixture("test_particles_fallback");

  const resolved = resolver.resolve(manifest);

  expect(resolved.operations[0].matchName).toBe("CC Particle World");
  expect(resolved.operations[0]._originalMatchName).toBe("Trapcode Particular");
  expect(resolved.operations[0]._fallbackApplied).toBe(true);
});

it("fails pre-validation when no plugin and no fallback exist", () => {
  const catalog = new FakeCatalog([]);
  expect(() => new ManifestValidator(catalog).assertValid({
    stageId: "bad", operations: [{ op: "APPLY_MATCHNAME", matchName: "Unknown FX" }]
  })).toThrow("Unknown FX");
});
```

### ماتریس Simulation

| شناسه | هدف | Catalog fixture | معیار موفقیت |
|---|---|---|---|
| SIM-001 | افکت موجود | `native-only.json` | `valid=true`، یک operation برنامه‌ریزی شود |
| SIM-002 | Fallback Trapcode | بدون Particular، با CC Particle World | matchName به native تغییر کند، warning ثبت شود |
| SIM-003 | Fallback چندمرحله‌ای | فقط Particle Playground | زنجیره تا گزینه دوم ادامه یابد |
| SIM-004 | خطای Schema | حذف `stageId` | قبل از ارسال به Inbox reject شود |
| SIM-005 | idempotency | اجرای fixture دو بار | تعداد لایه/افکت duplicate نشود |
| SIM-006 | Timeout | Bridge بدون Receipt | status=`TIMEOUT` و Process Node آزاد شود |

## ۷.۲ تست Live و اعتبارسنجی Receipt

### سناریوی Heavy Sample Composition

یک Project آزمایشی با مشخصات زیر در ماشین دارای License معتبر آماده می‌شود:

- Composition: `E2E_HEAVY_1920x1080`، رزولوشن `1920x1080`، مدت `10s`، `24fps`.
- Layerها: Background، Camera 3D، Null Controller، Text، `PARTICLES_MASTER`، دو Adjustment Layer.
- FX: `Trapcode Particular` با حدود 20,000 particle/sec، `Element 3D` با یک مدل تستی،
  Color Grade، Glow و Motion Blur؛ در ماشین فاقد پلاگین، Fallback فعال است.
- خروجی: `receipts/e2e/heavy-sample.mov` با codec تعیین‌شده در Render Settings.

### Manifest تست Live

```json
{
  "version": "1.5",
  "stageId": "live_heavy_sample",
  "target": { "scope": "NEW_ADJUSTMENT", "compName": "E2E_HEAVY_1920x1080" },
  "operations": [
    { "op": "APPLY_MATCHNAME", "matchName": "Trapcode Particular", "fallbackMatchNames": ["CC Particle World"] },
    { "op": "APPLY_MATCHNAME", "matchName": "VC Element 3D", "fallbackMatchNames": ["ADBE Geometry Options"] },
    { "op": "APPLY_MATCHNAME", "matchName": "Deep Glow", "fallbackMatchNames": ["ADBE Glow"] },
    { "op": "SET_EXPRESSION", "propPath": ["Opacity"], "expression": "wiggle(0.4, 3);" }
  ]
}
```

### Receipt مورد انتظار

```json
{
  "protocolVersion": "1.5",
  "jobId": "job_e2e_heavy_001",
  "status": "SUCCESS",
  "startTime": "2025-01-15T11:00:00.000Z",
  "endTime": "2025-01-15T11:04:18.240Z",
  "renderTime": 258240,
  "outputFile": "receipts/e2e/heavy-sample.mov",
  "md5": "9f86d081884c7d659a2feaa0c55ad015",
  "fallbacks": [
    { "requested": "Trapcode Particular", "applied": "CC Particle World" }
  ],
  "validation": { "frameCount": 240, "width": 1920, "height": 1080, "colorDepth": "32bpc" },
  "logTail": [
    "[INFO] Stage live_heavy_sample applied: 4 operations",
    "[WARN] Particular unavailable; native fallback applied",
    "[INFO] Render complete: 240 frames",
    "[INFO] Output hash verified"
  ]
}
```

### Assertions اجباری Live

```typescript
// tests/e2e/heavy-composition.spec.ts
it("renders heavy composition and verifies receipt", async () => {
  const receipt = await orchestrator.render({
    compName: "E2E_HEAVY_1920x1080",
    outputFile: "receipts/e2e/heavy-sample.mov"
  });

  expect(receipt.status).toBe("SUCCESS");
  expect(receipt.outputFile).toMatch(/heavy-sample\.mov$/);
  expect(receipt.renderTime).toBeGreaterThan(0);
  expect(receipt.md5).toMatch(/^[a-f0-9]{32}$/);

  const stat = await fs.promises.stat(receipt.outputFile!);
  expect(stat.size).toBeGreaterThan(1024);
  expect(receipt.validation?.width).toBe(1920);
  expect(receipt.validation?.height).toBe(1080);
  expect(receipt.logTail?.length).toBeGreaterThan(0);
});
```

## ۷.۳ خط لوله CI و معیارهای خروج

| مرحله CI | Command / کار | محیط | Exit Criteria (معیار عبور) |
|---|---|---|---|
| **lint** | `npm run lint` + `tsc --noEmit` | هر Agent | صفر خطای ESLint، صفر Type Error |
| **validate manifests** | `npm run validate:manifests` | Node بدون AE | همه‌ی فایل‌ها مطابق JSON Schema؛ هیچ matchName بی‌قاعده‌ای وجود ندارد |
| **unit tests** | `npm test -- --coverage` | Node | تست‌ها سبز، پوشش منطق Validator/Fallback حداقل 85٪ |
| **dry-run** | `npm run e2e:dry-run` | Node + Fake Catalog | همه‌ی SIM-001 تا SIM-006 عبور؛ Inbox واقعی خالی بماند |
| **smoke render** | `npm run ae:smoke` | AE Headless/Interactive | Composition پنج‌ثانیه‌ای render شود، Receipt SUCCESS، hash معتبر |
| **full E2E** | `npm run e2e:live` | Agent دارای AE و Plugins | Heavy Sample کامل، resolution و frame count صحیح، output قابل پخش |
| **artifact archive** | `npm run receipts:archive` | CI | Receipt و log tail آرشیو، فایل‌های موقت پاک‌سازی |

نمونه Pipeline در GitHub Actions (Smoke در صورت وجود Runner مربوط به AE):

```yaml
# .github/workflows/omega-ci.yml
name: OMEGA FX Pipeline
on: [push, pull_request]
jobs:
  node-quality:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run validate:manifests
      - run: npm test -- --coverage
      - run: npm run e2e:dry-run

  ae-smoke:
    if: ${{ vars.AE_RUNNER == 'true' }}
    runs-on: [self-hosted, windows, after-effects]
    needs: node-quality
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run ae:generate-catalog
      - run: npm run ae:smoke
      - run: npm run receipts:verify
      - uses: actions/upload-artifact@v4
        with:
          name: omega-receipts
          path: receipts/
```

معیار Release Gate: هیچ `FAILED` یا `TIMEOUT` بدون triage در Receiptها باقی نماند؛
نسخه‌ی Catalog با Target AE همخوان باشد؛ hash خروجی تست Live در manifest به‌عنوان
checksum مرجع ثبت شود؛ و Fallbackهای رخ‌داده صرفاً warning باشند، نه خطای پنهان.

---

## پیوست: چک‌لیست پیاده‌سازی اولیه

- [ ] ساخت `Inbox/Outbox` با ACL محدود و atomic rename.
- [ ] اجرای `build-effects-catalog.jsx` روی هر ماشین Target و commit نکردن Catalog محلی بدون metadata.
- [ ] پیاده‌سازی JSON Schema validator در Node (`ajv` با draft 2020-12).
- [ ] تعریف mapping پارامترهای Fallback و تست مقادیر Min/Max.
- [ ] فعال‌سازی log با `jobId` در Node، JSX و Receipt.
- [ ] تست Undo و Crash Isolation روی یک Project کپی‌شده.
- [ ] ثبت Color Management، AE version، plugin catalog hash و OS در Receipt.
- [ ] اجرای Dry-Run در CI قبل از هر اتصال به AE.
- [ ] ساخت Heavy Sample و نگهداری آن خارج از production Project.

## جمع‌بندی معماری

این طراحی یک مرز روشن بین Decision و Execution ایجاد می‌کند: **Node.js** مانیفست،
Catalog، Validation، Fallback و orchestration را مدیریت می‌کند؛ **ExtendScript** فقط
مکانیک امن دستکاری AE را انجام می‌دهد؛ و **JSON Inbox/Outbox** هر Job را قابل ردیابی
و قابل تکرار می‌کند. استفاده‌ی اجباری از `matchName`، Catalog versioning، fallback
شفاف، Undo Group، Watchdog و Receipt باعث می‌شود نبود یک پلاگین یا تغییر Locale، کل
خط تولید را از کار نیندازد.
