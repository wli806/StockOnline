# 库存管理系统

基于 Next.js 16 + Prisma + SQLite 的多角色进销存管理系统，支持酒类、宝可梦卡片等商品管理，以及寿司店采购模块。

## 功能模块

### 主营业务
- **商品管理** — 商品信息维护，定价支持 AUD/CNY 切换输入
- **库存管理** — 自动同步采购到货数量
- **采购订单** — 按批次追踪进价，支持运费录入（AUD/CNY 自动换算），可同时展开多条明细
- **供应商管理** — 供应商档案维护
- **销售订单** — 按采购批次精确核算成本与利润，支持多条同时展开
- **客户管理** — 客户档案维护
- **财务流水** — 收支记录
- **利润报表** — 按周 / 月汇总利润

### 寿司店模块（仅 root 账户可见）
- **订单管理** — 同步自 St Pierre's OSS 系统，含日历热力图（标注下单日 / 配送日）
- **库存统计** — 手动记录店内物品库存，支持 +/- 快速调整数量

## 角色权限

| 功能 | root | 所有者 | 管理员 | 投资者 | 查看者 |
|------|:----:|:------:|:------:|:------:|:------:|
| 商品 / 供应商 / 客户管理 | ✓ | ✓ | ✓ | ✗ | ✗ |
| 库存 / 采购 / 销售订单（查看） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 所有写操作（新增 / 修改 / 删除） | ✓ | ✓ | ✓ | ✗ | ✗ |
| 财务流水 / 利润报表 | ✓ | ✓ | ✓ | ✓ | ✗ |
| 进价 / 利润数据 | ✓ | ✓ | ✓ | ✓ | ✗ |
| 用户管理（查看） | ✓ | ✓ | ✓ | ✗ | ✗ |
| 用户管理（新增 / 修改 / 删除） | ✓ | ✗ | ✗ | ✗ | ✗ |
| 寿司店模块 | ✓ | ✗ | ✗ | ✗ | ✗ |

> **root** 是超级管理员账户，拥有全部权限，包括寿司模块和用户权限修改。

## 本地运行

### 1. 安装 Node.js

前往 [nodejs.org](https://nodejs.org) 下载 LTS 版本安装，安装后验证：

```bash
node -v
npm -v
```

### 2. 克隆并安装依赖

```bash
git clone <仓库地址>
cd <项目目录>
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

打开 `.env`，修改以下字段：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 随机字符串，生产环境务必修改 |
| `OSS_USERNAME` | St Pierre's OSS 账号（寿司模块） |
| `OSS_PASSWORD` | St Pierre's OSS 密码（寿司模块） |

### 4. 初始化数据库

```bash
npx prisma generate
npx prisma migrate deploy
node scripts/init-db.mjs
```

初始账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| root | root | 超级管理员 |

**首次登录后请立即修改密码。**

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 服务器部署

```bash
git pull
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart all
```

> 如遇 GitHub 连接问题，可先执行：
> `git remote set-url origin https://kkgithub.com/<用户名>/<仓库名>.git`

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 数据库 | SQLite via Prisma v7 |
| 认证 | JWT (jose) + bcryptjs |
| 样式 | Tailwind CSS 4 |
| 图标 | lucide-react |
| 进程管理 | PM2 |
