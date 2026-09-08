'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

type PdfViewerProps = {
  src: string
  fileName: string
  className?: string
}

/**
 * EmbedPDF is browser/WASM based, so keep the actual viewer client-only.
 * This avoids Next.js SSR/hydration issues while preserving the existing
 * PdfViewer component API used by Files and Share Viewer.
 */
const EmbedPDFViewer = dynamic(
  () => import('@embedpdf/react-pdf-viewer').then((mod) => mod.PDFViewer),
  { ssr: false },
)

export default function PdfViewer({ src, fileName, className = '' }: PdfViewerProps) {
  const [ready, setReady] = useState(false)

  // Keep the config stable so changing unrelated parent state does not
  // cause EmbedPDF to treat the same source as a new document.
  const config = useMemo(
    () => ({
      src,
      theme: {
        preference: 'system' as const,
      },
      tabBar: 'never' as const,
      export: {
        defaultFileName: fileName || 'document.pdf',
      },
    }),
    [src, fileName],
  )

  return (
    <div className={`relative min-h-[70vh] w-full overflow-hidden rounded-xl bg-white ${className}`}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 size={30} className="animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-slate-600">Memuat PDF...</p>
            <p className="max-w-xs text-xs text-slate-400">
              Menyiapkan PDF viewer dan memuat dokumen.
            </p>
          </div>
        </div>
      )}

      <div className="h-[70vh] min-h-[520px] w-full">
        <EmbedPDFViewer
          config={config}
          style={{ height: '100%', width: '100%' }}
          onReady={() => setReady(true)}
        />
      </div>
    </div>
  )
}
