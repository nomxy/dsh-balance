# 上架流程 · dsh-usage-chip（自己执行版）

账号：GitHub `nomxy`（已验证存在）／npm 同名账号已注册。
目标：`dsh plugin add dsh-usage-chip` 能被别人装，并出现在 dsh-market 的 **Usage & Billing** 分类。

本机现状（我这边的机器，和你操作时的环境一致）：

- 代码已提交：仓库在 `C:\Users\siyin\.dsh\profiles\desktop\local-plugins\dsh-usage-chip`，首次提交 `f328d54`，`.gitignore` 已就位。
- 发布包已打好：`dist\dsh-usage-chip-0.1.0.tgz`（19.8 KB，8 个文件齐全）。
- **这台电脑打不开 `github.com` 网页**（443 连接重置/超时），也打不开 `www.npmjs.com`（403）。`api.github.com`、`github.com:22`、`registry.npmjs.org` 正常。
- PATH 上没有 node/npm/pnpm，但可以用 DSH 自带的 pnpm（下面的命令已封装好）。
- 我这边 `C:\Users\siyin\.ssh\` 被安全策略禁止访问，所以 **SSH 方式要你自己配**；推荐走 HTTPS + Token。

> 时间提醒：目录要求仓库**成立满 1 天**。今天建库 → 明天再提 PR，否则会被自动检查拒。

---

## 第 1 步 · 建空仓库（手机或任意能上网的设备，2 分钟）

1. 打开 https://github.com/new
2. Repository name：`dsh-usage-chip`
3. 选 **Public**
4. **不要**勾 "Add a README file"、不要选 .gitignore、不要选 license（勾了会和本地提交冲突）
5. Create repository

建好后地址是 `https://github.com/nomxy/dsh-usage-chip`。

---

## 第 2 步 · 打 topic（同一页，1 分钟）

仓库首页右侧 **About** 旁的齿轮 ⚙️ → **Topics** 填：

```
dsh-plugin
deepseek-harness
dsh
```

Save。`dsh-plugin` 是收录硬性条件（自动校验），少这一个 PR 必被拒。

---

## 第 3 步 · 推代码（需要一台能开 github.com 的机器 + 终端）

### 3a. 生成 Token（在手机上做，1 分钟）

GitHub → 右上头像 → **Settings** → 左栏最下 **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**：

- Note：`dsh-usage-chip-push`
- Expiration：7 days
- 勾选 **`repo`** 一项即可
- Generate → 复制 `ghp_...`（只显示一次）

### 3b. 推送

在你自己的终端里（PowerShell 或 Git Bash 都行）：

```powershell
cd C:\Users\siyin\.dsh\profiles\desktop\local-plugins\dsh-usage-chip

git remote add origin https://github.com/nomxy/dsh-usage-chip.git
git push -u origin main
```

弹窗要账号时：

- 用户名填 `nomxy`
- 密码处**粘贴那个 `ghp_...` token**（不是账号密码）

成功的话最后一行是 `branch 'main' set up to track 'origin/main'`。

> 如果这台电脑连不上 github.com，就把整个 `dsh-usage-chip` 目录拷到能上网的电脑上，重复上面两条命令（仓库已经在里面，`.git` 一起拷）。
> 想用 SSH 也行：`ssh-keygen -t ed25519 -C "nomxy@pc"` → 把 `~/.ssh/id_ed25519.pub` 贴到 GitHub → Settings → SSH and GPG keys → 再把 remote 换成 `git@github.com:nomxy/dsh-usage-chip.git`。

验收：浏览器打开 `https://github.com/nomxy/dsh-usage-chip`，能看到 8 个文件（`lib/`、`cordis.patch.yml`、`package.json`、`README.md`、`LICENSE`、`icon.svg`、`.gitignore`、`PUBLISHING.md`）。

---

## 第 4 步 · 发布到 npm（1 分钟）

两个前提：npm 邮箱已验证；`dsh-usage-chip` 这个名字仍是空的（我查过一次，是空的；发布前可再查一遍）。

```powershell
# 0) 名字占用检查（返回 404 = 没被占）
curl.exe -s -o NUL -w "%{http_code}" https://registry.npmjs.org/dsh-usage-chip

# 1) 设变量（这台机器没有 node，用 DSH 自带的 pnpm）
$EXE  = "C:\Users\siyin\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe"
$PNPM = "C:\Users\siyin\AppData\Local\Programs\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\pnpm\bin\pnpm.cjs"
cd C:\Users\siyin\.dsh\profiles\desktop\local-plugins\dsh-usage-chip

# 2) 登录（会开浏览器走授权；网页被 Cloudflare 卡就改用下面 2b 的 token 方式）
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM login
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM whoami    # 应打印 nomxy

# 3) 发布
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM publish --access public --no-git-checks
```

### 2b. 网页登录走不通时用 Token（推荐，最省事）

npm 网站 → 头像 → **Access Tokens** → **Generate New Token** → **Granular Access Token**：

- Name：`publish-dsh-usage-chip`
- Expiration：7 days
- Permissions：**Read and write**
- Packages：All packages（或只选 `dsh-usage-chip`）
- Generate → 复制 `npm_...`

然后：

```powershell
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM config set "//registry.npmjs.org/:_authToken" "npm_粘贴到这里"
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM whoami     # 应打印 nomxy
$env:ELECTRON_RUN_AS_NODE=1; & $EXE $PNPM publish --access public --no-git-checks
```

发布成功后 token 建议删掉：`& $EXE $PNPM config delete "//registry.npmjs.org/:_authToken"`，并在网页上 Revoke 该 token。

验收（不用登录，直接查 registry）：

```powershell
curl.exe -s https://registry.npmjs.org/dsh-usage-chip | Select-Object -First 1
```
返回的 JSON 里能看到 `"name":"dsh-usage-chip"`、`"version":"0.1.0"` 就是成功了；页面上也会出现 https://www.npmjs.com/package/dsh-usage-chip 。

---

## 第 5 步 · 提收录 PR（明天，仓库满 1 天后）

**别往 dsh-market 仓库提**（那只是市场应用）。要提的是目录仓库：
https://github.com/awesome-dsh-plugin/awesome-dsh-plugin

1. 点 **Fork**（fork 到 `nomxy/awesome-dsh-plugin`）
2. 在 fork 里新建文件，路径**必须**是：

```
data/plugins/nomxy__dsh-usage-chip.yml
```

内容（原样复制，中文那句必须以句号结尾）：

```yaml
url: https://github.com/nomxy/dsh-usage-chip
name: nomxy/dsh-usage-chip
category: usage
description:
  en: A 20px DeepSeek balance chip in the sidebar name row, showing peak/off-peak state and a countdown to the next switch, with per-million-token prices on hover.
  zh: 侧栏名字行里的 20px DeepSeek 余额胶囊，显示峰谷状态与下次切换倒计时，悬停可看每百万 tokens 单价。
```

3. 提 PR 到 `main`：

标题：

```
Add nomxy/dsh-usage-chip (usage)
```

正文：

```
Adds dsh-usage-chip — a compact DeepSeek balance + peak/off-peak chip mounted in
the sidebar name row instead of taking a full-width card.

- declares dsh.bundle (./cordis.patch.yml)
- published on npm as dsh-usage-chip 0.1.0 (installs with `dsh plugin add dsh-usage-chip`)
- repo has the dsh-plugin topic
- host half only serves two loopback-only routes (/api/dsh-usage-chip, /api/dsh-usage-chip/holidays)
- host half derived from @dougen/dsh-deepseek-usage (MIT), attribution kept in LICENSE
- no telemetry; the API key never leaves the machine
```

4. 等合并（通常一天内），README 会自动重新生成，dsh-market 里就能搜到。

---

## 第 6 步 · 上架后验证

1. 自己的机器上换新 profile 装一遍：`dsh plugin --profile <新profile> add dsh-usage-chip`
2. DSH → **Plugins → Plugin Market** 搜 `dsh-usage-chip`
3. 或 **Plugins → Discover → Index sources** 加 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` 后搜

---

## 已知坑（这次真踩到的）

| 坑 | 现象 | 处理 |
|---|---|---|
| `file:` 依赖是**拷贝**不是软链 | 改完源码重启没变化（「峰谷」就这么丢过一次） | 改完同步进 `node_modules/dsh-usage-chip/`，或重新 `dsh plugin add` |
| 本机没有 node/npm | `pnpm: command not found` | 用 `ELECTRON_RUN_AS_NODE=1 "...\DeepSeek Harness.exe" "...\pnpm.cjs"` |
| 这台电脑上不了 github.com | 443 重置/超时，但 `api.github.com` 正常 | 换手机热点/加速器，或整目录拷到别的机器推 |
| npm 网页 Cloudflare 循环 | `www.npmjs.com 正在进行安全验证` | 用第 4 步的 Granular Token，不依赖网页登录 |
| 仓库太新 | PR 被自动检查拒 | 建库满 1 天后再提 |
| 忘打 `dsh-plugin` topic | 同上 | 仓库 About → Topics |
| 上游是 MIT | 不写归属 = 侵权 | `LICENSE` 里 @dougen 的声明别删 |
| 分类写错 | 进不了对应栏目 | 只能写 `usage` |

---

## 一句话版本

建空库 → 打 `dsh-plugin` topic → `git push`（用 PAT）→ `pnpm publish`（名字 `dsh-usage-chip`）→ 明天往 `awesome-dsh-plugin` 提 `data/plugins/nomxy__dsh-usage-chip.yml`。
