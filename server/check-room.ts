import { PrismaClient } from '@prisma/client';

async function checkRoom() {
  const prisma = new PrismaClient();
  const room = await prisma.room.findUnique({
    where: { secureInviteCode: '9676512066manoj@' }
  });
  console.log('Room:', room);
}
checkRoom();
