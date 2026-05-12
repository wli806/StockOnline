# 库存管理系统

基于 Next.js 16 + Prisma + SQLite 的库存与销售管理系统，支持酒类/宝可梦卡片等商品的进销存管理。

## 功能

- 商品管理（进价/成本录入）
- 库存管理（自动同步采购到货）
- 采购订单（按批次追踪进价）
- 供应商管理
- 销售订单（按采购批次精确计算利润）
- 客户管理
- 财务流水
- 利润报表（按周/月）
- 多角色权限（所有者 / 投资者 / 查看者）

## 本地运行

### 1. 环境要求

- Node.js 18+
- npm 或 yarn

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

打开 `.env`，将 `JWT_SECRET` 改成一个随机字符串（生产环境务必修改）。

### 4. 初始化数据库

```bash
npx prisma migrate deploy
node scripts/init-db.mjs
```

这会创建数据库并生成初始管理员账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| root | root | 所有者 |

### 5. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 角色权限说明

| 功能 | 所有者 | 投资者 | 查看者 |
|------|--------|--------|--------|
| 商品/客户/供应商管理 | ✓ | ✗ | ✗ |
| 库存/采购/销售订单（查看） | ✓ | ✓ | ✓ |
| 所有写操作（新增/修改/删除） | ✓ | ✗ | ✗ |
| 财务流水 / 利润报表 | ✓ | ✓ | ✗ |
| 进价 / 利润数据（订单内） | ✓ | ✓ | ✗ |
| 用户管理 | ✓ | ✗ | ✗ |

## 技术栈

- **框架**：Next.js 16 (App Router)
- **数据库**：SQLite via Prisma v7 + @prisma/adapter-libsql
- **认证**：JWT (jose) + bcryptjs
- **样式**：Tailwind CSS 4
- **图标**：lucide-react
