import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authUtils'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser || currentUser.role.toLowerCase() !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    const { id } = await params
    if (currentUser.id === id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400 })
    }
    await prisma.user.delete({ where: { id } })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
