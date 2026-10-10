# AE-Titan Project Audit

## 1. جمع‌بندی اجرایی

پروژه اکنون یک پنل CEP عامل‌محور با سه حالت Ask، Agent و Script، providerهای Copilot/HADI و providerهای محلی، اجرای commandهای allowlist شده، تأیید mutation، journal عملیاتی، verification پس از اجرا و یک repair retry دارد.

مهم‌ترین موفقیت فعلی، وجود زنجیره واقعی `prompt -> provider -> normalize/validate -> confirmation -> hostCall -> summary/healthReport -> journal` است. مهم‌ترین blocker امنیتی، اجرای مستقیم source مدل/کاربر با `eval` در host است. این قابلیت باید تا زمان sandbox یا policy صریح، محدود یا غیرفعال شود.

## 2. قابلیت‌های تأییدشده

| قابلیت | مسیر | وضعیت | شواهد | ریسک |
|---|---|---|---|---|
| Ask read-only guard | `ae-chat-panel/js/app.js` | ناقص/نیازمند تست | دستورهای read-only از mutation جدا شده‌اند و prompt mode محدودیت دارد | تست end-to-end مستقل برای اثبات عدم mutation وجود ندارد |
| Agent plan و تأیید mutation | `ae-chat-panel/js/app.js` | تأییدشده در کد | `executeRequest` پیش از اجرای plan از کاربر confirmation می‌گیرد | نیازمند تست CEP واقعی |
| اجرای commandهای AE | `ae-chat-panel/jsx/host.jsx` | تأییدنشده در AE واقعی | `aeStudioCommand` commandهای متعدد را dispatch می‌کند | نسخه AE، property و pluginها می‌توانند رفتار را تغییر دهند |
| verification پس از اجرا | `ae-chat-panel/js/app.js` | کامل در مسیر کد | `verifyCompletedPlan` ابتدا `summary` و سپس `healthReport` را می‌خواند | کیفیت verification به health report فعلی محدود است |
| repair یک‌باره | `ae-chat-panel/js/app.js` | کامل در مسیر کد | retry فقط وقتی `repairAttempt` صفر است و پاسخ باید یک `runScript` معتبر باشد | provider response و اجرای AE واقعی نیازمند تست |
| repository indexing/search | `ae-chat-panel/vscode-copilot-bridge/project-repository.js` | ناقص | hash، bounded retrieval، max files و max bytes دارد | refresh افزایشی و invalidation خودکار ندارد |
| local provider routing | `ae-chat-panel/vscode-copilot-bridge/local-providers.js` | تأییدشده در کد | Ollama، GPT4All و LM Studio probe و model selection دارند | runtime providerها در این محیط تست نشده‌اند |
| runtime harness | `ae-chat-panel/test/TITAN_HARNESS_RUNNER.jsx` | فقط AE واقعی | Unicode، MatchName، error trap و Render Queue را تست می‌کند | بدون AE قابل اجرا نیست |

## 3. یافته‌های مهم

### High: اجرای کد دلخواه؛ guard host اضافه شده، sandbox کامل باقی است

- مسیر: `ae-chat-panel/jsx/host.jsx`, تابع `runExtendScript`، خط 716
- رفتار: `eval(source)` هر source رسیده از پنل را در context کامل After Effects اجرا می‌کند.
- علت ریشه‌ای: `runScript` به‌عنوان escape hatch طراحی شده و host همچنان source را با `eval` اجرا می‌کند. پنل و host اکنون guardهای APIهای سیستم، شبکه، nested eval و external eval را اعمال می‌کنند.
- اثر: prompt یا provider مخرب می‌تواند فایل بخواند، فایل بنویسد، پروژه را تغییر دهد یا داده را به سرویس خارجی ارسال کند.
- اصلاح انجام‌شده: `safeScriptSource` در پنل و `aeStudioSafeScript` در host APIهای پرخطر را رد می‌کنند. این defense-in-depth است، نه sandbox کامل؛ production هنوز نیازمند خاموش‌کردن command یا تبدیل آن به script manifest امضاشده و API محدود در host است.
- تست پذیرش: source شامل `File`, `Folder`, `system.callSystem`, `$.evalFile` و network access باید قبل از host رد شود؛ source مجاز باید فقط APIهای ثبت‌شده را اجرا کند.

### High: sandbox مسیر در host؛ traversal ورودی پنل کاهش یافته و کنترل host اضافه شد

- مسیرها: `host.jsx` خطوط 454، 466، 499، 514، 565 و 704
- رفتار: output render، save، restore snapshot، import footage، audio و open project با path مستقیم `new File(path)` کار می‌کنند.
- علت ریشه‌ای: validation پنل root مجاز یا canonical path ندارد.
- اصلاح انجام‌شده: `safeProviderPath` در پنل و `aeStudioSafePath` در host اکنون control character و parent traversal را رد می‌کنند؛ restore snapshot نیز فقط داخل `.ae-studio-snapshots` پروژه فعال مجاز است. canonical root کامل و بررسی symlink در سطح Node هنوز برای production لازم است.
- تست پذیرش: `..`، UNC path، symlink/junction، مسیر خارج از workspace و فایل با پسوند جعلی باید رد شوند.

### High: payload harness به host منتقل نمی‌شد؛ اصلاح شد

- مسیر: `ae-chat-panel/jsx/host.jsx`, خط 748
- رفتار: dispatch برای `runValidationHarness` تابع را بدون payload صدا می‌زند: `runValidationHarness()`.
- نتیجه: `extensionPath` ارسالی از caller نادیده گرفته می‌شود و harness فقط مسیر fallback را امتحان می‌کند.
- اصلاح انجام‌شده: dispatcher اکنون `runValidationHarness(payload || {})` را صدا می‌زند. canonicalization مسیر هنوز باید اضافه شود.
- تست پذیرش: harness در مسیر موقت مشخص‌شده اجرا شود و مسیر نامعتبر با خطای ساختاریافته برگردد.

### Medium: محدودیت request در bridge؛ اصلاح شد

- مسیر: `ae-chat-panel/vscode-copilot-bridge/extension.js`, تابع `readJson`، خط 180
- رفتار قبلی: body تا ۲MB جمع می‌شد و پس از عبور از حد، request destroy می‌شد؛ caller ممکن بود پاسخ ساختاریافته دریافت نکند.
- اصلاح انجام‌شده: body بزرگ drain می‌شود و پاسخ `413` با کد `PAYLOAD_TOO_LARGE` و `X-Request-Id` برمی‌گردد؛ bridge برای هر client loopback نیز سقف ۶۰ درخواست در دقیقه با پاسخ `429/RATE_LIMITED` دارد. timeoutهای provider هنوز قابل تقویت هستند.

### Medium: تست UndoIsolation نام دقیق خود را اثبات نمی‌کند

- مسیر: `ae-chat-panel/test/TITAN_HARNESS_RUNNER.jsx`, تست `TC-03`
- رفتار: تست با اضافه‌کردن layer بررسی می‌کند `project.numItems` تغییر نکرده، اما از `app.executeCommand(app.findMenuCommandId("Undo"))` یا snapshot قبل/بعد استفاده نمی‌کند.
- اصلاح: mutation را داخل undo group مستقل اجرا کنید، undo را اعمال کنید و قبل/بعد composition و layer را مقایسه کنید.

## 4. شکاف زنجیره end-to-end

| مرحله | وضعیت |
|---|---|
| intent detection | موجود، اما heuristic و provider-dependent |
| context retrieval | موجود از repository manifest و search؛ bounded است |
| planning | موجود، plan تا ۱۶ command محدود شده |
| generation | JSON normalization و alias mapping موجود است |
| validation | command و payload validation موجود؛ source خام هنوز خطرناک است |
| confirmation | برای mutation و runScript موجود است |
| host execution | dispatch واقعی موجود است؛ نیازمند AE واقعی |
| recovery | یک repair retry موجود است |
| verification | summary و healthReport موجود است |
| journaling | operation record موجود است؛ audit export مستقل ندارد |

## 5. ماتریس تست

| ID | سناریو | محیط | وضعیت |
|---|---|---|---|
| T01 | Ask بدون mutation | Mock/CEP | نیازمند تست |
| T02 | ساخت composition در Agent | CEP/AE | نیازمند AE واقعی |
| T03 | اجرای runScript پیچیده | AE | پرریسک؛ باید policy امنیتی داشته باشد |
| T04 | pasted Titan script | AE | نیازمند تست |
| T05 | malformed provider JSON | Mock | مسیر خطا موجود، تست مستقل لازم |
| T06 | خطای script و یک repair | Mock/AE | مسیر کد موجود، تست integration لازم |
| T07 | save پروژه unsaved | AE | harness مستقل لازم |
| T08 | snapshot و restore | AE | پیاده‌سازی موجود، path security باز است |
| T09 | health report | AE | پیاده‌سازی موجود، تست runtime لازم |
| T10 | queue بدون render | AE | harness پوشش پایه دارد |
| T11 | Persian Unicode | AE | harness دارد |
| T12 | missing footage | AE | health report دارد، تست لازم |
| T13 | provider unavailable | Mock/VS Code | پیام خطا موجود، تست endpoint لازم |

## 6. Roadmap اولویت‌دار

### P0

1. جایگزینی کامل `eval(source)` با script manifest امضاشده و API محدود برای `runScript`.
2. canonical path policy برای همه عملیات فایل و snapshot.
3. انتقال payload به `runValidationHarness` و افزودن تست regression.
4. تکمیل timeoutهای provider؛ request ID، پاسخ استاندارد body بزرگ و rate limit انجام شده‌اند.

### P1

1. کامل‌کردن transform/keyframe/effect test matrix در AE واقعی.
2. قوی‌ترکردن harness Undo، Unicode، missing footage و render queue.
3. افزودن verification اختصاصی برای نتیجه مورد انتظار هر command، نه فقط سلامت عمومی پروژه.

### P2

1. incremental repository indexing بر اساس mtime/hash.
2. export قابل جست‌وجوی operation journal و retention policy.
3. transport chunking برای scriptهای بزرگ و cancellation واقعی.

## 7. Batch بعدی پیشنهادی

1. **تکمیل امن‌سازی runScript**: guard پنل و host انجام شده؛ گام بعدی حذف `eval` آزاد و تست رد source دارای APIهای ممنوع است.
2. **Path sandbox**: جلوگیری از traversal و overwrite خارج از workspace.
3. **اصلاح harness payload**: تغییر یک خط و تست regression مستقیم.
4. **تست malformed provider و repair**: اثبات اینکه پیام `Completed` بدون اجرای موفق تولید نمی‌شود.
5. **اجرای harness در AE واقعی**: تنها راه تأیید propertyهای ExtendScript، font/Unicode، MatchName و Render Queue.

## نتیجه مالک پروژه

پروژه از نظر orchestration و قابلیت‌های mock/کد، پایه قابل اتکایی دارد؛ اما هنوز نباید آن را production-safe یا «کامل در AE» اعلام کرد. guardهای پنل و host و اصلاح harness انجام شده‌اند. قدم بعدی باید جایگزینی کامل `eval(source)`، canonical root در Node، سپس اجرای `T03` و `T06` در یک محیط AE واقعی باشد.

## آخرین اعتبارسنجی محلی

- `node --check` روی sourceهای هدف: PASS
- parse manifestهای `package.json` با Node: PASS
- parse `app.js` و `host.jsx`: PASS؛ JSX از stdin به parser داده شد چون Node پسوند `.jsx` را مستقیم نمی‌پذیرد.
- تست AE harness: نیازمند After Effects واقعی
- `git diff --check`: اجرا نشد؛ workspace فعلی repository گیت نیست.

## وضعیت ae-hybrid-copilot-suite

- provider timeout: پیاده‌سازی شد؛ timeout پیش‌فرض ۱۵ ثانیه، `AbortController`، خطای `504/PROVIDER_TIMEOUT` و حفظ `requestId` دارد.
- schema startup: پیاده‌سازی شد؛ validator از Ajv 2020 استفاده می‌کند و aliasهای cross-schema را resolve می‌کند.
- CEP dispatcher: `AEHybridSuite.dispatchCommand` با JSON structured، allowlist command و error boundary تولید می‌شود؛ host dispatcher source خام را اجرا نمی‌کند.
- validation: builder، تست‌های Python، smoke test و `node-sidecar` tests موفق شدند.
- بسته‌بندی: part1 تا part6 و full با CRC سالم بازسازی شدند.
- runtimeهای After Effects، Blender و Unreal: همچنان نیازمند تست واقعی محیط مقصد هستند.

## Phase 4: VS Code-style UI and Integrated Agent Terminal

- UI generator: tabs `Chat`, `Suggestions`, `Quick Actions` و `Terminal`، dark IDE theme، chat bubbles، quick-action chips، tool cards، spinner و disclaimer در `build_suite.py` تولید می‌شوند.
- Tool lifecycle: `cep-extension/js/copilot.js` کارت‌های `running/success/error` را برای hostscript، bridge و terminal render می‌کند.
- Integrated terminal: `POST /api/terminal/exec` با SSE frameهای `started`, `stdout/stderr` و `completed`، approval اجباری، allowlist `config/commands.json`، cwd sandbox، cap خروجی و timeout ۳۰ ثانیه.
- Live evidence: اجرای `python --version` از SSE با `exitCode: 0` موفق شد؛ command بدون approval با `APPROVAL_REQUIRED` رد شد.
- Rate limit live: از ۶۵ درخواست، ۶ پاسخ `429` با `Retry-After: 60` و requestId یکسان در header/body ثبت شد.
- Provider timeout live: پاسخ `504/PROVIDER_TIMEOUT` با requestId یکسان و timeout آزمایشی ۲۵ms ثبت شد.
- TCP smoke: `blender smoke_bridge: PASS` و `unreal smoke_bridge: PASS`; پروتکل length-prefixed و response envelope بررسی شد.
- UI contract checks: tabs، local xterm assets، terminal allowlist، tool-card renderer و zero raw eval همگی `true`.
- After Effects window initialization، CEP واقعی، Blender با `bpy` و Unreal با `unreal`: نیازمند تست در runtime مقصد هستند.
- Hardened AE smoke: `real-ae-smoke.jsx` اکنون socketهای 8080/9999 را با timeout دوثانیه‌ای امتحان می‌کند، خطاهای 10061/10057 را به `OFFLINE_GRACEFUL_SKIP` تبدیل می‌کند و در همه مسیرها JSON report تولید می‌کند. اجرای AfterFX.com در این محیط exit code صفر و report معتبر تولید کرد؛ DOM comp/file-I/O نتیجه `FAIL` داد و باید در اجرای تعاملی CEP/AE بررسی شود.
- Live smoke orchestrator: `ae-hybrid-copilot-suite/scripts/run_live_smoke.py` سرویس‌ها را اجرا، readiness پورت‌ها را بررسی، AfterFX.com را launch و `real-ae-smoke-result.txt` را validate می‌کند.
- Autonomous Director core: `src/core/inspector.js` snapshot نرمال‌شده تولید می‌کند؛ `src/core/scenario_engine.js` prompt را به beat sheet ده‌ثانیه‌ای با approval/refine actions تبدیل می‌کند؛ `src/core/copilot.js` lifecycle tool events را emit می‌کند.
- Asset pipeline: `src/core/asset_manager.js` و `src/python/asset_service.py` مسیر امن، SHA-256، MIME و beat timestampهای deterministic دارند.
- Atomic AE executor: `extendscript/lib/executor.jsx` commandهای allowlist شده را بدون `eval` اجرا می‌کند، error object ساختاریافته می‌دهد و execution را در undo group واحد می‌پیچد.
- Autonomous scenario smoke: `scripts/smoke_test.js` با یک prompt dark-fantasy، storyboard سه‌beat و snapshot context تولید کرد: PASS.

## Production-Grade Workstation Target Profile

- Host role: Production-Grade Hybrid 2D/3D Workstation & Local Inference Node
- CPU baseline: Intel Core i9-10900K, 10 cores / 20 threads, up to 5.3 GHz Turbo
- GPU baseline: NVIDIA GeForce RTX 3080, 12 GB GDDR6X VRAM
- Memory baseline: 32 GB DDR4
- OS baseline: Windows 10 Pro 64-bit
- Config tier: `PRODUCTION_GRADE_GPU_ACCELERATED`
- Pre-flight: `ae-hybrid-copilot-suite/scripts/validate_workspace.py` checks CPU thread capacity, NVIDIA SMI VRAM, and optional PyTorch/CuPy CUDA probes. The current machine reported 20 threads, 12 GB VRAM, and `ready: true`.