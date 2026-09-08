'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, Loader2 } from 'lucide-react'

type PdfViewerProps = {
  src: string
  fileName: string
  className?: string
}

export default function PdfViewer({ src, fileName, className = '' }: PdfViewerProps) {
  const [pdf, setPdf] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderingRef = useRef(false)

  // Load pdf.js + document
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // @ts-ignore
        const pdfjsLib = await import('pdfjs-dist/build/pdf')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.js',
          import.meta.url,
        ).toString()

        const resp = await fetch(src)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = new Uint8Array(await resp.arrayBuffer())
        const doc = await pdfjsLib.getDocument({ data, disableAutoFetch: true }).promise

        if (!cancelled) {
          setPdf(doc)
          setTotal(doc.numPages)
          setPage(1)
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('PDF load error:', err)
          setError(err.message || 'Gagal memuat PDF')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [src])

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdf || renderingRef.current) return
    renderingRef.current = true

    try {
      const p = await pdf.getPage(page)
      const viewport = p.getViewport({ scale, rotation })
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      ctx.scale(dpr, dpr)

      await p.render({ canvasContext: ctx, viewport }).promise
    } catch (err) {
      console.error('Render page error:', err)
    } finally {
      renderingRef.current = false
    }
  }, [pdf, page, scale, rotation])

  useEffect(() => { renderPage() }, [renderPage])

  // Preload next/prev pages
  useEffect(() => {
    if (!pdf) return
    const neighbors = [page - 1, page + 1].filter((n) => n >= 1 && n <= total)
    neighbors.forEach((n) => pdf.getPage(n).catch(() => {}))
  }, [pdf, page, total])

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <Loader2 size={32} className="animate-spin text-indigo-500" />
        <p className="text-sm text-slate-500">Memuat PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <p className="text-sm text-red-500">{error}</p>
        <a href={src} download={fileName}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Download size={14} /> Download
        </a>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-t-xl bg-slate-100 px-4 py-2 text-sm">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
          className="rounded-lg p-1 hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="min-w-[80px] text-center text-slate-600">{page} / {total}</span>
        <button onClick={() => setPage((p) => Math.min(total, p + 1))} disabled={page >= total}
          className="rounded-lg p-1 hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={16} /></button>

        <div className="mx-2 h-4 w-px bg-slate-300" />

        <button onClick={() => setScale((s) => Math.max(0.3, s - 0.2))}
          className="rounded-lg p-1 hover:bg-slate-200"><ZoomOut size={16} /></button>
        <span className="min-w-[48px] text-center text-slate-500">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(4, s + 0.2))}
          className="rounded-lg p-1 hover:bg-slate-200"><ZoomIn size={16} /></button>

        <div className="mx-2 h-4 w-px bg-slate-300" />

        <button onClick={() => setRotation((r) => (r + 90) % 360)}
          className="rounded-lg p-1 hover:bg-slate-200"><RotateCw size={16} /></button>
        <a href={src} download={fileName} className="rounded-lg p-1 hover:bg-slate-200"><Download size={16} /></a>
      </div>

      {/* Canvas */}
      <div className="overflow-auto rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 p-4"
        style={{ maxHeight: '70vh' }}>
        <canvas ref={canvasRef} className="shadow-md" />
      </div>
    </div>
  )
}
