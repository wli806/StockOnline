import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "tommy" } });
  if (existing) {
    console.log("Owner 账户已存在，跳过初始化");
    return;
  }

  const hashed = await bcrypt.hash("tommy123", 10);
  await prisma.user.create({
    data: {
      username: "tommy",
      password: hashed,
      role: "OWNER",
    },
  });
  console.log("✅ Owner 账户创建成功");
  console.log("   用户名: tommy");
  console.log("   密  码: tommy123");
  console.log("   请登录后立即修改密码！");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
