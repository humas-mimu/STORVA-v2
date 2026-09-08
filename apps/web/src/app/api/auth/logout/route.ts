export async function GET(req: Request) { return handleLogout(req) }
export async function POST(req: Request) { return handleLogout(req) }

async function handleLogout(_req: Request) {
  // Hapus session cookie dengan meng-expire-nya di semua variasi path
  // Tidak perlu validasi user — jika tidak ada session, tidak ada yang perlu dihapus
  const expiredCookie = 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': expiredCookie,
      'Content-Type': 'application/json',
    },
  })
}
