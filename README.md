# dsh-usage-chip

DeepSeek Harness 侧边栏余额胶囊：把 **DeepSeek 官方账户余额** 和 **峰谷时段** 做成一个 20px 高的小胶囊，贴在侧栏页脚「名字那一行」的右侧，不占一整块地方。

`¥56.10 · 谷 1d9h`

- **余额**：来自 DeepSeek 官方 `GET /user/balance`，用 DSH 凭证服务里的 `DEEPSEEK_API_KEY`（不出本机）。
- **峰谷**：官方高峰/空闲时段实时判断，橙色「峰」/ 绿色「谷」，后面跟距下次切换的倒计时（`2d15h` / `5h47m` / `23m`），每 15 秒刷新。
- **当前档位单价**：鼠标悬停显示输入 / 输入缓存 / 输出单价（元 / 百万 tokens），以及余额是否可用。
- **交互**：点击立即刷新；后台每 30 秒心跳一次；侧栏折叠成 36px 图标栏时自动隐藏，展开即回来。
- **失败可见**：未配置 Key、余额接口超时或返回异常时胶囊显示 `—`，悬停能看到原因，不会编数字。

## 安装

```sh
dsh plugin --profile <你的 profile> add dsh-usage-chip
```

装完刷新页面或重启 `dsh web` 即生效。要求 DSH `>= 0.2.1`（`dsh.client` + `dsh.bundle` 清单）。

## 配置

无需配置。余额需要 DSH 里已经配好 DeepSeek 的 API Key：

- 凭证引用：`DEEPSEEK_API_KEY`（与 `llm-deepseek` 同一引用）；
- 想换网关地址时可用环境变量 `DEEPSEEK_BASE_URL`（注意：指向第三方网关时 API Key 会发给该地址）。

## 隐私与安全

- 插件只做两件事：读凭证、请求官方余额接口。不收集、不上报，没有遥测。
- 宿主半只注册两条本机路由（`/api/dsh-usage-chip`、`/api/dsh-usage-chip/holidays`），且只接受 `Host` 为回环地址或本监听地址的请求（与 DSH 自身 `/api` 栅栏同一口径）；跨站标记与异源 `Origin` 一律拒绝。
- 上游错误原文不会透出到界面（上游异常消息里可能带凭据片段）。

## 已知限制

- 只支持 DeepSeek 官方平台余额；第三方路由上的同名模型不适用官方峰谷定价，此时只显示余额。
- 峰谷与节假日规则是内置表（`lib/pricing.js`），官方调整规则或放假日历时需要更新版本。
- 胶囊是通过 DOM 挂载进侧栏名字行的（DSH 没有「名字后面」这个槽位），因此侧栏结构大改时需要跟着调整选择器 `div[class*="triggerRow"]`。

## 来源与致谢

宿主半（`lib/index.js`、`lib/pricing.js`：余额读取、峰谷与节假日规则、单价表）取自
[@dougen/dsh-deepseek-usage](https://github.com/dougen/dsh-deepseek-usage)（MIT），仅把插件 id 与路由改名，并去掉了对 `@deepseek-ai/dsh-credentials` 的运行时依赖（`credentialRef` 是编译期 brand，运行时为恒等函数）。
客户端半（`lib/client.js`）为本项目重写：不注册槽位，直接挂载紧凑胶囊。

## License

MIT，见 [LICENSE](./LICENSE)（包含上游 MIT 声明）。

---

## English

A 20px balance chip for the DeepSeek Harness sidebar footer, sitting right of the name row: official DeepSeek balance plus the current peak/off-peak window with a countdown to the next switch, hover for the active model's unit prices, click to refresh. No telemetry; the host half only serves two loopback-only routes. Install with `dsh plugin --profile <profile> add dsh-usage-chip`. Host half derived from `@dougen/dsh-deepseek-usage` (MIT).
