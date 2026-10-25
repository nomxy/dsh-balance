# 上架清单 · dsh-usage-chip

目标：让这个插件出现在 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录（dsh-market 的「Usage & Billing」分类），别人一句 `dsh plugin add` 就能装。

> 本清单按顺序做即可。带 ☐ 的是动作，带 ✅ 的是机器上已经就绪的。

---

## 0. 前置条件

- ☐ **GitHub 账号**（必需，目录本身就是 GitHub 仓库里的文件）
- ☐ **npm 账号**（建议；没有也能上架，只是别人要按仓库地址装）
- ☐ 仓库**成立满 1 天**才会被收录（今天建库 → 明天再提 PR）
- ☐ 仓库打上 **`dsh-plugin`** topic（收录硬性条件，自动校验）
- ✅ `package.json` 里有 `dsh.bundle` 清单 → 已满足（`./cordis.patch.yml`），这是最容易被拒的一条

---

## 1. 本地预检（这台机器，约 2 分钟）

这台机器 **PATH 上没有 node / npm / pnpm**，但 DSH 自带了 pnpm，需要用「Electron 当 node」的方式跑：

```bash
EXE="/c/Users/siyin/AppData/Local/Programs/DeepSeek Harness/DeepSeek Harness.exe"
PNPM="/c/Users/siyin/AppData/Local/Programs/DeepSeek Harness/resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
SRC="/c/Users/siyin/.dsh/profiles/desktop/local-plugins/dsh-usage-chip"

cd "$SRC"

# 1) 语法检查
for f in lib/*.js; do ELECTRON_RUN_AS_NODE=1 "$EXE" --check "$f" || echo "FAIL $f"; done

# 2) 打包预检：看会发出哪些文件（应为 lib/、cordis.patch.yml、README.md、LICENSE、icon.svg）
ELECTRON_RUN_AS_NODE=1 "$EXE" "$PNPM" pack --dry-run
```

验收：`--check` 无输出（全部通过）；`pack --dry-run` 的清单应**正好**是这 8 项（2026-10-24 实测通过）：

```
cordis.patch.yml   icon.svg   lib/client.js   lib/index.js
lib/pricing.js     LICENSE    package.json    README.md
```

没有 `node_modules`、没有 `PUBLISHING.md`（`files` 白名单挡着，属预期）。

---

## 2. 建仓库并推代码

```bash
cd "/c/Users/siyin/.dsh/profiles/desktop/local-plugins/dsh-usage-chip"

git init -b main
git config user.name  "<你的 GitHub 用户名>"
git config user.email "<你的邮箱>"
printf 'node_modules/\n*.tgz\n' > .gitignore

git add -A
git commit -m "feat: compact DeepSeek usage chip for the DSH sidebar"
```

然后在网页上建空仓库（不要勾 README / .gitignore / license）：

- 打开 https://github.com/new
- Repository name：`dsh-usage-chip`
- Public ✅，不要初始化任何文件
- Create repository

```bash
git remote add origin https://github.com/<你的用户名>/dsh-usage-chip.git
git push -u origin main
```

> Windows 推送时会弹 GitHub 登录窗口（浏览器授权），用你刚注册的账号登录即可。

☐ **打 topic**：仓库页 → 右上 ⚙️（About 旁）→ Topics 填 `dsh-plugin`、`deepseek-harness`、`dsh` → Save。

---

## 3. 发布到 npm（可选，建议做）

前提：npm 账号已注册并验证邮箱。

```bash
EXE="/c/Users/siyin/AppData/Local/Programs/DeepSeek Harness/DeepSeek Harness.exe"
PNPM="/c/Users/siyin/AppData/Local/Programs/DeepSeek Harness/resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
cd "/c/Users/siyin/.dsh/profiles/desktop/local-plugins/dsh-usage-chip"

# 登录（会走网页授权；国内网络下 npmjs.com 可能被人机验证卡住，见「已知坑」）
ELECTRON_RUN_AS_NODE=1 "$EXE" "$PNPM" login

# 确认身份
ELECTRON_RUN_AS_NODE=1 "$EXE" "$PNPM" whoami     # 应打印你的 npm 用户名

# 发布
ELECTRON_RUN_AS_NODE=1 "$EXE" "$PNPM" publish --access public --no-git-checks
```

验收（不需要登录，直接查 registry）：

```bash
curl -s https://registry.npmjs.org/dsh-usage-chip | head -c 200
```

`dsh-usage-chip` 这个名字我查过，**当时未被占用**；如果发布时报 `403 You do not have permission` 说明名字已被别人抢注，改名（例如 `dsh-deepseek-usage-chip`）后重新 `pnpm publish`。

---

## 4. 提交收录 PR

**不要**往 dsh-market 仓库提条目（它只是市场应用）。要提的是：

- 仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
- 做法：Fork → 新增**一个**文件 `data/plugins/<你的用户名>__dsh-usage-chip.yml` → 提 PR

文件内容（`<你的用户名>`、描述按需改，**中文那句必须以句号结尾**）：

```yaml
url: https://github.com/<你的用户名>/dsh-usage-chip
name: <你的用户名>/dsh-usage-chip
category: usage
description:
  en: A 20px DeepSeek balance chip in the sidebar name row, with peak/off-peak state and a countdown to the next switch, priced per million tokens on hover.
  zh: 侧栏名字行里的 20px DeepSeek 余额胶囊，显示峰谷状态与下次切换倒计时，悬停可看每百万 tokens 单价。
```

PR 标题：`Add <你的用户名>/dsh-usage-chip (usage)`

PR 正文模板：

```
Adds dsh-usage-chip — a compact DeepSeek balance + peak/off-peak chip mounted in
the sidebar name row instead of taking a full-width card.

- declares dsh.bundle (./cordis.patch.yml)
- installs with: dsh plugin --profile <name> add <npm name or repo URL>
- host half only serves two loopback-only routes (/api/dsh-usage-chip/*)
- host half derived from @dougen/dsh-deepseek-usage (MIT), attribution kept in LICENSE
- no telemetry, no credentials leave the machine
```

合并后 README 会自动重新生成，**通常一天内**在 dsh-market 里能搜到。

---

## 5. 上架后验证

1. DSH → **Plugins → Plugin Market**，搜 `dsh-usage-chip`；
2. 或在 **Plugins → Discover → Index sources** 加 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`；
3. 换台机器/新 profile 实测：`dsh plugin --profile <name> add dsh-usage-chip`。

---

## 6. 已知坑（都是这次真踩到的）

| 坑 | 现象 | 处理 |
|---|---|---|
| `file:` 依赖是**拷贝**不是软链 | 改了源码重启没变化（本次「峰谷」就这么丢的） | 改完把文件同步进 `node_modules/dsh-usage-chip/`，或重新 `dsh plugin add` |
| 本机没有 node/npm | `pnpm: command not found` | 用上面的 `ELECTRON_RUN_AS_NODE=1 "DeepSeek Harness.exe" pnpm.cjs` 跑法 |
| npm 网页被 Cloudflare 卡循环验证 | `www.npmjs.com 正在进行安全验证` 转圈 | 换手机热点/别的网络；`registry.npmjs.org` 本身通常可达，发布走命令行不受影响 |
| GitHub 网页 443 超时 | DNS 正常但 TLS 超时 | 等网络波动过去或换热点重试 |
| 仓库太新 | PR 被自动检查拒 | 建库满 1 天后再提 |
| 忘了打 topic | 同上 | 仓库 About → Topics 填 `dsh-plugin` |
| 上游是 MIT | 不写归属 = 侵权 | `LICENSE` 已含 @dougen 的 MIT 声明，别删；README 也写了来源 |
| 分类填错 | 直接进不了目录 | 只填 `usage`（对应「Usage & Billing」） |

---

## 7. 明天告诉我这些，我就能一口气做完

1. GitHub 用户名（例如 `siyin-1112`）；
2. ~~要不要发 npm~~ → **已确认：要发 npm**（2026-10-25）。所以注册时 GitHub + npm 两个账号都要办：
   - npm 网页被人机验证卡住循环时换手机热点再试；注册完发布走命令行（`registry.npmjs.org` 通常可达，不依赖网页）；
   - 发布命令见第 3 节，名字 `dsh-usage-chip` 当时未被占用；
3. 仓库地址建好后（或者授权我推）。

剩下的 git 提交、topic、yml、PR 文案、验收命令，我这边全部现成。
