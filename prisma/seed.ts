import { prisma } from './client'
import { hash } from 'argon2'

async function main() {
  // Example seed data for development
  const password = await hash('Storva123!')
  const user = await prisma.user.upsert({
    where: { email: 'demo@storva.local' },
    update: {},
    create: {
      email: 'demo@storva.local',
      username: 'demo',
      passwordHash: password,
    },
  })

  console.log({ user })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    // Disconnect Prisma Client
    void prisma.$disconnect()
  })