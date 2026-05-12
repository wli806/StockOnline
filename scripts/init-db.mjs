import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../dev.db");

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "tommy" } });
  if (existing) {
    console.log("✅ Owner 账户已存在 (tommy)，无需重复初始化");
    return;
  }

  const hashed = await bcrypt.hash("tommy123", 10);
  await prisma.user.create({
    data: { username: "tommy", password: hashed, role: "OWNER" },
  });
  console.log("✅ Owner 账户创建成功！");
  console.log("   用户名: tommy");
  console.log("   密  码: tommy123");
  console.log("   ⚠️  请登录后前往「用户管理」修改密码！");
}

main().catch(console.error).finally(() => prisma.$disconnect());
