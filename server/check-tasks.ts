import { PrismaClient } from '@prisma/client';

async function checkTasks() {
  const prisma = new PrismaClient();
  const tasks = await prisma.task.findMany({ include: { user: true } });
  console.log("All tasks in DB:");
  console.dir(tasks, { depth: null });
}

checkTasks();
