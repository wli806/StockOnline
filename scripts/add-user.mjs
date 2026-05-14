import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../dev.db");

const [,, username, password, role] = process.argv;

if (!username || !password || !role) {
  console.log("用法: node scripts/add-user.mjs <用户名> <密码> <角色>");
  console.log("角色可选: OWNER | INVESTOR | VIEWER");
  console.log("示例: node scripts/add-user.mjs tommy 123456 INVESTOR");
  process.exit(1);
}

if (!["OWNER", "INVESTOR", "VIEWER"].includes(role)) {
  console.error("❌ 角色必须是 OWNER、INVESTOR 或 VIEWER");
  process.exit(1);
}

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`❌ 用户名 "${username}" 已存在`);
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { username, password: hashed, role } });
  console.log(`✅ 用户创建成功：${username} / ${role}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
