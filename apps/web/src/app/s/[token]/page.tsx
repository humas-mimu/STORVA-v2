import { notFound } from 'next/navigation'
import { repository } from '@/lib/repository'
import { ShareViewer } from '@/components/share-viewer'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const share = await repository.shareLink.findUnique({
    where: { token },
    include: {
      file: true
    }
  })

  if (!share) notFound()

  // Validasi expired
  if (share.expiresAt && share.expiresAt < new Date()) {
    return <div>Link expired</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ShareViewer share={share} />
    </div>
  )
}
