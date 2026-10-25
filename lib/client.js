// dsh-usage-chip — browser half.
//
// 不注册任何 sidebar 槽位：在侧边栏页脚"名字那一行"（triggerRow）里挂一个
// 紧凑胶囊（¥余额 + 峰/谷时段 + 距下次切换倒计时），位于名字与右侧指示灯之间。
// 每 30 秒以及点击时拉宿主路由 /api/dsh-usage-chip（见 lib/index.js）。
window.__ModuleLoader__.load({
	id: "dsh-usage-chip",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const USAGE_PATH = "/api/dsh-usage-chip";
		const POLL_MS = 30 * 1000;
		const TICK_MS = 15 * 1000;
		const CHIP_CLASS = "dsh-usage-chip";

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
		let state = { total: null, currency: "CNY", peak: null, tier: null, next: null, error: null };

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
				sepEl.style.display = "";
				const remaining = remainingMs();
				const text = countdownText(remaining);
				countdownEl.textContent = text === "" ? "" : text;
			}
			const lines = [];
			lines.push(state.error === null ? "DeepSeek 余额，点击刷新" : "余额读取失败：" + state.error);
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

		function buildChip() {
			const node = document.createElement("button");
			node.type = "button";
			node.className = CHIP_CLASS;
			node.dataset.error = "0";
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
			amountEl = amount;
			sepEl = sep;
			phaseEl = phase;
			countdownEl = countdown;
			return node;
		}

		/** 挂到"名字那一行"：紧跟名字按钮、位于连接/更新指示灯之前。 */
		function ensureMounted() {
			if (unmounted || chip === null) return;
			const row = document.querySelector('div[class*="triggerRow"]');
			if (row === null) return;
			if (row.contains(chip)) return;
			const anchor = row.children.length > 1 ? row.children[1] : null;
			row.insertBefore(chip, anchor);
			render();
		}

		function start() {
			if (styleEl === null) {
				styleEl = document.createElement("style");
				styleEl.dataset.plugin = "dsh-usage-chip";
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
			}, "dsh-usage-chip: sidebar chip");
		}

		exports.name = "dsh-usage-chip";
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
