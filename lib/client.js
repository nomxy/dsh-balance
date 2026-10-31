// dsh-balance — browser half.
//
// 不注册任何 sidebar 槽位：在侧边栏页脚"名字那一行"（triggerRow）里挂一个
// 紧凑胶囊（¥余额 + 峰/谷时段 + 距下次切换倒计时），位于名字与右侧指示灯之间。
// 每 30 秒以及点击时拉宿主路由 /api/dsh-balance（见 lib/index.js）。
// 右键胶囊打开设置菜单：大小 / 位置 / 形式，选择存 localStorage。
window.__ModuleLoader__.load({
	id: "@nomxy/dsh-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const USAGE_PATH = "/api/dsh-balance";
		const POLL_MS = 30 * 1000;
		const TICK_MS = 15 * 1000;
		const CHIP_CLASS = "dsh-balance";
		const MENU_CLASS = CHIP_CLASS + "-menu";
		const PREFS_KEY = "dsh-balance:prefs";

		const SIZES = [
			{ id: "small", label: "小" },
			{ id: "normal", label: "标准" },
			{ id: "large", label: "大" },
		];
		const POSITIONS = [
			{ id: "right", label: "名字右侧" },
			{ id: "left", label: "名字左侧" },
			{ id: "end", label: "行末" },
		];
		const FORMS = [
			{ id: "pill", label: "胶囊" },
			{ id: "text", label: "纯文字" },
			{ id: "dot", label: "圆点" },
			{ id: "amount", label: "仅金额" },
		];

		const CSS = `
.${CHIP_CLASS}{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;flex:none;
box-sizing:border-box;border-radius:999px;border:1px solid var(--dsw-color-border,rgba(127,127,127,.3));
background:transparent;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums;
font:500 11.5px/18px var(--dsw-font-family,system-ui,-apple-system,"Segoe UI",sans-serif);
color:var(--dsw-color-text-secondary,#6b7280);transition:background .15s ease,color .15s ease}
.${CHIP_CLASS}:hover{background:var(--dsw-color-fill-hover,rgba(127,127,127,.14));color:var(--dsw-color-text,inherit)}
.${CHIP_CLASS}[data-error="1"]{color:var(--dsw-color-danger,#dc2626);border-color:currentColor}
.${CHIP_CLASS}__sep{opacity:.4;margin:0 1px}
.${CHIP_CLASS}__phase{font-weight:600;letter-spacing:.2px}
.${CHIP_CLASS}__phase[data-phase="peak"]{color:#d97706}
.${CHIP_CLASS}__phase[data-phase="idle"]{color:#15803d}
.${CHIP_CLASS}__phase[data-phase="none"]{display:none}
.${CHIP_CLASS}__cd{opacity:.75;font-weight:500}
div[class*="triggerRow"][class*="railRow"] .${CHIP_CLASS}{display:none}

/* 大小 */
.${CHIP_CLASS}[data-size="small"]{height:18px;padding:0 6px;font-size:10.5px;gap:4px}
.${CHIP_CLASS}[data-size="large"]{height:24px;padding:0 9px;font-size:13px;gap:6px}

/* 形式 */
.${CHIP_CLASS}[data-form="text"]{border-color:transparent;background:transparent;padding:0;gap:4px}
.${CHIP_CLASS}[data-form="text"]:hover{background:transparent;text-decoration:underline}
.${CHIP_CLASS}[data-form="amount"] .${CHIP_CLASS}__sep,
.${CHIP_CLASS}[data-form="amount"] .${CHIP_CLASS}__phase,
.${CHIP_CLASS}[data-form="amount"] .${CHIP_CLASS}__cd{display:none}
.${CHIP_CLASS}[data-form="dot"] .${CHIP_CLASS}__sep{display:none}
.${CHIP_CLASS}[data-form="dot"] .${CHIP_CLASS}__phase{display:inline-block;width:6px;height:6px;
min-width:6px;border-radius:50%;background:currentColor;overflow:hidden;text-indent:-9999px;letter-spacing:0}

/* 设置菜单 */
.${MENU_CLASS}{position:fixed;z-index:2147483000;min-width:196px;padding:6px;box-sizing:border-box;
border-radius:10px;border:1px solid var(--dsw-color-border,rgba(127,127,127,.28));
background:var(--dsw-color-surface,#fff);color:var(--dsw-color-text,#111827);
box-shadow:0 12px 32px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.08);
font:400 12px/1.4 var(--dsw-font-family,system-ui,-apple-system,"Segoe UI",sans-serif);user-select:none}
.${MENU_CLASS}__group{padding:2px 0 4px}
.${MENU_CLASS}__group + .${MENU_CLASS}__group{border-top:1px solid var(--dsw-color-border,rgba(127,127,127,.18))}
.${MENU_CLASS}__label{padding:4px 8px 2px;font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;
color:var(--dsw-color-text-tertiary,#9ca3af)}
.${MENU_CLASS}__item{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;
padding:5px 8px;box-sizing:border-box;border:0;border-radius:6px;background:transparent;cursor:pointer;
font:inherit;color:inherit;text-align:left}
.${MENU_CLASS}__item:hover,.${MENU_CLASS}__item:focus-visible{outline:none;
background:var(--dsw-color-fill-hover,rgba(127,127,127,.14))}
.${MENU_CLASS}__item[aria-checked="true"]{font-weight:600}
.${MENU_CLASS}__tick{opacity:0;font-size:11px}
.${MENU_CLASS}__item[aria-checked="true"] .${MENU_CLASS}__tick{opacity:1}
.${MENU_CLASS}__hint{padding:4px 8px 2px;font-size:10.5px;color:var(--dsw-color-text-tertiary,#9ca3af)}
`;

		let styleEl = null;
		let chip = null;
		let amountEl = null;
		let phaseEl = null;
		let countdownEl = null;
		let sepEl = null;
		let timer = null;
		let ticker = null;
		let observer = null;
		let unmounted = false;
		let fetchedAt = 0;
		let menuEl = null;
		let menuCleanup = null;
		let state = { total: null, currency: "CNY", peak: null, tier: null, next: null, error: null };
		let prefs = { size: "normal", position: "right", form: "pill" };

		function symbolOf(currency) {
			if (currency === "CNY" || currency === "RMB") return "¥";
			if (currency === "USD") return "$";
			return "";
		}

		function amountText() {
			if (state.error !== null) return "—";
			if (state.total === null) return "…";
			return symbolOf(state.currency) + state.total.toFixed(2);
		}

		function priceLine(tier) {
			if (!tier || tier.known === false) return "";
			const parts = [];
			if (typeof tier.input === "number") parts.push("输入 " + tier.input);
			if (typeof tier.cacheRead === "number") parts.push("缓存 " + tier.cacheRead);
			if (typeof tier.output === "number") parts.push("输出 " + tier.output);
			return parts.length === 0 ? "" : "元/百万 tokens：" + parts.join(" · ");
		}

		/** 距下次峰谷切换的剩余时间：`2d15h` / `5h47m` / `23m`。 */
		function countdownText(ms) {
			if (!(ms > 0)) return "";
			const totalMinutes = Math.floor(ms / 60000);
			const days = Math.floor(totalMinutes / 1440);
			const hours = Math.floor((totalMinutes % 1440) / 60);
			const minutes = totalMinutes % 60;
			if (days > 0) return days + "d" + hours + "h";
			if (hours > 0) return hours + "h" + (minutes > 0 ? minutes + "m" : "");
			return minutes + "m";
		}

		/** 剩余的切换毫秒数：宿主给的是"发起请求那一刻"的毫秒，按本地流逝扣掉。 */
		function remainingMs() {
			if (state.next === null || typeof state.next.ms !== "number") return NaN;
			const elapsed = fetchedAt === 0 ? 0 : Date.now() - fetchedAt;
			return state.next.ms - elapsed;
		}

		// ---- 偏好 -------------------------------------------------------

		function normalizePrefs(raw) {
			const next = { size: "normal", position: "right", form: "pill" };
			if (raw === null || typeof raw !== "object") return next;
			if (SIZES.some((item) => item.id === raw.size)) next.size = raw.size;
			if (POSITIONS.some((item) => item.id === raw.position)) next.position = raw.position;
			if (FORMS.some((item) => item.id === raw.form)) next.form = raw.form;
			return next;
		}

		function loadPrefs() {
			try {
				const raw = window.localStorage.getItem(PREFS_KEY);
				prefs = normalizePrefs(raw === null ? null : JSON.parse(raw));
			} catch (error) {
				prefs = normalizePrefs(null);
			}
		}

		function savePrefs() {
			try {
				window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
			} catch (error) {
				/* 存储不可用时保持内存态，不打扰用户 */
			}
		}

		function applyPrefs() {
			if (chip === null) return;
			chip.dataset.size = prefs.size;
			chip.dataset.form = prefs.form;
			if (sepEl !== null && prefs.form === "dot") sepEl.style.display = "none";
			render();
			ensureMounted();
		}

		// ---- 渲染 -------------------------------------------------------

		function render() {
			if (chip === null) return;
			amountEl.textContent = amountText();
			chip.dataset.error = state.error === null ? "0" : "1";
			if (state.peak === null) {
				phaseEl.dataset.phase = "none";
				phaseEl.textContent = "";
				sepEl.style.display = "none";
				countdownEl.textContent = "";
			} else {
				phaseEl.dataset.phase = state.peak ? "peak" : "idle";
				phaseEl.textContent = state.peak ? "峰" : "谷";
				sepEl.style.display = prefs.form === "dot" ? "none" : "";
				const remaining = remainingMs();
				const text = countdownText(remaining);
				countdownEl.textContent = text === "" ? "" : text;
			}
			const lines = [];
			lines.push(state.error === null ? "DeepSeek 余额，点击刷新，右键设置" : "余额读取失败：" + state.error);
			if (state.peak !== null) {
				const remaining = remainingMs();
				const text = countdownText(remaining);
				lines.push((state.peak ? "高峰时段" : "空闲时段") + (text === "" ? "" : "，距切换 " + text));
			}
			const prices = priceLine(state.tier);
			if (prices !== "") lines.push(prices);
			chip.title = lines.filter((line) => line !== "").join("\n");
		}

		async function load() {
			try {
				const response = await fetch(USAGE_PATH, { cache: "no-store", credentials: "same-origin" });
				const body = await response.json().catch(() => null);
				if (!response.ok || body === null || body.ok !== true) {
					const message = body && Array.isArray(body.errors) && body.errors.length > 0 ? body.errors[0] : "HTTP " + response.status;
					state = Object.assign({}, state, { error: String(message) });
				} else {
					const balance = body.balance || {};
					const total = typeof balance.total === "number" && Number.isFinite(balance.total) ? balance.total : null;
					fetchedAt = Date.now();
					state = {
						total,
						currency: typeof balance.currency === "string" ? balance.currency : "CNY",
						peak: typeof body.peak === "boolean" ? body.peak : null,
						tier: body.tier || null,
						next: body.next || null,
						error: Array.isArray(body.errors) && body.errors.length > 0 ? String(body.errors[0]) : null,
					};
				}
			} catch (error) {
				state = Object.assign({}, state, { error: "余额接口无法连接" });
			}
			render();
		}

		// ---- 设置菜单 ---------------------------------------------------

		function closeMenu() {
			if (menuCleanup !== null) {
				menuCleanup();
				menuCleanup = null;
			}
			if (menuEl !== null) menuEl.remove();
			menuEl = null;
		}

		function menuGroup(title, options, key) {
			const group = document.createElement("div");
			group.className = MENU_CLASS + "__group";
			group.setAttribute("role", "group");
			const label = document.createElement("div");
			label.className = MENU_CLASS + "__label";
			label.textContent = title;
			group.appendChild(label);
			for (const option of options) {
				const item = document.createElement("button");
				item.type = "button";
				item.className = MENU_CLASS + "__item";
				item.dataset.key = key;
				item.dataset.value = option.id;
				item.setAttribute("role", "menuitemradio");
				item.setAttribute("aria-checked", prefs[key] === option.id ? "true" : "false");
				const text = document.createElement("span");
				text.textContent = option.label;
				const tick = document.createElement("span");
				tick.className = MENU_CLASS + "__tick";
				tick.textContent = "✓";
				item.appendChild(text);
				item.appendChild(tick);
				item.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (prefs[key] !== option.id) {
						prefs[key] = option.id;
						savePrefs();
						applyPrefs();
					}
					closeMenu();
				});
				group.appendChild(item);
			}
			return group;
		}

		function openMenu(x, y) {
			closeMenu();
			const menu = document.createElement("div");
			menu.className = MENU_CLASS;
			menu.setAttribute("role", "menu");
			menu.setAttribute("aria-label", "余额胶囊设置");
			menu.appendChild(menuGroup("大小", SIZES, "size"));
			menu.appendChild(menuGroup("位置", POSITIONS, "position"));
			menu.appendChild(menuGroup("形式", FORMS, "form"));
			const hint = document.createElement("div");
			hint.className = MENU_CLASS + "__hint";
			hint.textContent = "Esc 关闭 · 设置立即保存";
			menu.appendChild(hint);
			menu.addEventListener("contextmenu", (event) => event.preventDefault());
			document.body.appendChild(menu);
			menuEl = menu;

			// 视口内定位：右下溢出时向内收。
			const rect = menu.getBoundingClientRect();
			const left = Math.max(6, Math.min(x, window.innerWidth - rect.width - 6));
			const top = Math.max(6, Math.min(y, window.innerHeight - rect.height - 6));
			menu.style.left = left + "px";
			menu.style.top = top + "px";

			const items = Array.from(menu.querySelectorAll("." + MENU_CLASS + "__item"));
			const onKey = (event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					closeMenu();
					return;
				}
				if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
				event.preventDefault();
				const index = items.indexOf(document.activeElement);
				const step = event.key === "ArrowDown" ? 1 : -1;
				const nextIndex = index < 0 ? 0 : (index + step + items.length) % items.length;
				items[nextIndex].focus();
			};
			const onPointer = (event) => {
				if (menuEl !== null && !menuEl.contains(event.target)) closeMenu();
			};
			const onScroll = () => closeMenu();
			document.addEventListener("keydown", onKey, true);
			document.addEventListener("pointerdown", onPointer, true);
			window.addEventListener("scroll", onScroll, true);
			window.addEventListener("resize", onScroll);
			menuCleanup = () => {
				document.removeEventListener("keydown", onKey, true);
				document.removeEventListener("pointerdown", onPointer, true);
				window.removeEventListener("scroll", onScroll, true);
				window.removeEventListener("resize", onScroll);
			};
			items[0].focus();
		}

		function buildChip() {
			const node = document.createElement("button");
			node.type = "button";
			node.className = CHIP_CLASS;
			node.dataset.error = "0";
			node.dataset.size = prefs.size;
			node.dataset.form = prefs.form;
			const amount = document.createElement("span");
			amount.textContent = "…";
			const sep = document.createElement("span");
			sep.className = CHIP_CLASS + "__sep";
			sep.textContent = "·";
			const phase = document.createElement("span");
			phase.className = CHIP_CLASS + "__phase";
			phase.dataset.phase = "none";
			const countdown = document.createElement("span");
			countdown.className = CHIP_CLASS + "__cd";
			node.appendChild(amount);
			node.appendChild(sep);
			node.appendChild(phase);
			node.appendChild(countdown);
			node.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				load();
			});
			node.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				event.stopPropagation();
				openMenu(event.clientX, event.clientY);
			});
			node.addEventListener("keydown", (event) => {
				// 键盘等价入口：Shift+F10 或菜单键。
				if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
					event.preventDefault();
					const rect = node.getBoundingClientRect();
					openMenu(rect.left, rect.bottom + 4);
				}
			});
			amountEl = amount;
			sepEl = sep;
			phaseEl = phase;
			countdownEl = countdown;
			return node;
		}

		/** 挂到"名字那一行"：位置由偏好决定（名字左侧 / 名字右侧 / 行末）。 */
		function ensureMounted() {
			if (unmounted || chip === null) return;
			const row = document.querySelector('div[class*="triggerRow"]');
			if (row === null) return;
			const target = prefs.position === "left"
				? (row.firstElementChild || null)
				: prefs.position === "end"
					? null
					: (row.children.length > 1 ? row.children[1] : null);
			if (chip.parentNode === row && chip.nextElementSibling === target) return;
			if (chip.parentNode === row && target === null && row.lastElementChild === chip) return;
			if (target === null) row.appendChild(chip);
			else row.insertBefore(chip, target);
			render();
		}

		function start() {
			loadPrefs();
			if (styleEl === null) {
				styleEl = document.createElement("style");
				styleEl.dataset.plugin = "dsh-balance";
				styleEl.textContent = CSS;
				document.head.appendChild(styleEl);
			}
			chip = buildChip();
			ensureMounted();
			load();
			timer = setInterval(load, POLL_MS);
			// 倒计时与峰谷文字每 15 秒重算一次，不必等下一次请求。
			ticker = setInterval(render, TICK_MS);
			let scheduled = false;
			observer = new MutationObserver(() => {
				if (scheduled) return;
				scheduled = true;
				setTimeout(() => {
					scheduled = false;
					ensureMounted();
				}, 50);
			});
			observer.observe(document.documentElement, { childList: true, subtree: true });
		}

		function stop() {
			unmounted = true;
			closeMenu();
			if (observer !== null) observer.disconnect();
			if (timer !== null) clearInterval(timer);
			if (ticker !== null) clearInterval(ticker);
			if (chip !== null) chip.remove();
			if (styleEl !== null) styleEl.remove();
			observer = null;
			timer = null;
			ticker = null;
			chip = null;
			styleEl = null;
		}

		const inject = [];

		function apply(ctx) {
			ctx.effect(() => {
				start();
				return () => stop();
			}, "dsh-balance: sidebar chip");
		}

		exports.name = "@nomxy/dsh-balance";
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
