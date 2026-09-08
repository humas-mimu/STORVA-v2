'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardDrive, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, X } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/')
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Server error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #ffffff 0%, #e8eef6 25%, #6da3d9 65%, #1e5faf 100%)',
        padding: '2rem',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Decorative background circles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            top: '-10%',
            right: '-5%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
            bottom: '-5%',
            left: '-5%',
          }}
        />
      </div>

      {/* Main Card */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 940,
          minHeight: 540,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.3)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => router.push('/')}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
            e.currentTarget.style.color = '#64748b'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <X size={18} />
        </button>
        {/* ─── Left Panel: Branding ─── */}
        <div
          style={{
            flex: '0 0 45%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '3rem',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0f2857 0%, #1a4b8c 50%, #2176d2 100%)',
          }}
        >
          {/* Animated lines overlay */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Diagonal accent lines */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
              viewBox="0 0 400 600"
              fill="none"
              preserveAspectRatio="xMidYMid slice"
            >
              {[60, 140, 220, 300, 380].map((x, i) => (
                <line
                  key={i}
                  x1={x}
                  y1={0}
                  x2={x - 80}
                  y2={600}
                  stroke="white"
                  strokeWidth={1 + i * 0.3}
                  opacity={0.4 + i * 0.1}
                />
              ))}
              {[40, 120, 280, 360].map((x, i) => (
                <line
                  key={`d${i}`}
                  x1={x}
                  y1={0}
                  x2={x - 40}
                  y2={600}
                  stroke="rgba(100,180,255,0.5)"
                  strokeWidth={0.5}
                  strokeDasharray="4 8"
                />
              ))}
            </svg>
            {/* Floating dots */}
            {[
              { x: '15%', y: '20%', size: 4, opacity: 0.3 },
              { x: '70%', y: '15%', size: 3, opacity: 0.2 },
              { x: '85%', y: '45%', size: 5, opacity: 0.15 },
              { x: '30%', y: '70%', size: 3, opacity: 0.25 },
              { x: '60%', y: '80%', size: 4, opacity: 0.2 },
            ].map((dot, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: dot.x,
                  top: dot.y,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: '50%',
                  background: 'white',
                  opacity: dot.opacity,
                  animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <HardDrive size={22} color="white" />
              </div>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                STORVA
              </span>
            </div>

            {/* Welcome Text */}
            <h1
              style={{
                color: 'white',
                fontSize: '2.4rem',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '0.75rem',
                letterSpacing: '-0.03em',
              }}
            >
              Hello,
              <br />
              welcome!
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                maxWidth: 280,
                marginBottom: '1.5rem',
              }}
            >
              Your personal cloud, accessible anywhere.
              Manage files across your devices securely.
            </p>

            {/* Feature tags */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Encrypted', 'Multi-device', 'Fast Sync'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Form ─── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '3rem 2.5rem',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ maxWidth: 340, width: '100%', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  marginBottom: '0.75rem',
                }}
              >
                <Sparkles size={13} color="#3b82f6" />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6' }}>Secure Access</span>
              </div>
              <h2
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                Sign in to Storva
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>
                Enter your credentials to access your cloud
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Username */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                  Email / Username
                </label>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 12,
                    border: `1.5px solid ${focusedField === 'username' ? '#3b82f6' : '#e2e8f0'}`,
                    background: focusedField === 'username' ? '#f8fafc' : 'white',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'username' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                >
                  <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                    <Mail size={17} color={focusedField === 'username' ? '#3b82f6' : '#94a3b8'} />
                  </div>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="name@mail.com"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '13px 14px 13px 0',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.85rem',
                      color: '#1e293b',
                      background: 'transparent',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                  Password
                </label>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 12,
                    border: `1.5px solid ${focusedField === 'password' ? '#3b82f6' : '#e2e8f0'}`,
                    background: focusedField === 'password' ? '#f8fafc' : 'white',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                >
                  <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                    <Lock size={17} color={focusedField === 'password' ? '#3b82f6' : '#94a3b8'} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    style={{
                      flex: 1,
                      padding: '13px 14px 13px 0',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.85rem',
                      color: '#1e293b',
                      background: 'transparent',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      padding: '0 12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color="#94a3b8" />
                    ) : (
                      <Eye size={16} color="#94a3b8" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  marginTop: '0.25rem',
                  borderRadius: 12,
                  border: 'none',
                  background: loading
                    ? '#93c5fd'
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px -3px rgba(37,99,235,0.5)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 6px 20px -3px rgba(37,99,235,0.6)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 14px -3px rgba(37,99,235,0.5)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      <circle
                        cx={12}
                        cy={12}
                        r={10}
                        stroke="currentColor"
                        strokeWidth={3}
                        fill="none"
                        strokeDasharray="31.4 31.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Login
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                © 2026 Storva · Created by: @lin.nuha_ (HASANA GRAFIKA)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          div[style*="flex: 0 0 45%"] { display: none !important; }
          div[style*="max-width: 940px"] {
            border-radius: 16px !important;
            max-width: 420px !important;
          }
        }
      `}</style>
    </div>
  )
}
