export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx)
    }

    // For non-API routes, fall through to static assets
    return env.ASSETS.fetch(request)
  },
}

async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url)
  const path = url.pathname

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // POST /api/provider - Guardar credenciales del IPTV
    if (path === '/api/provider' && request.method === 'POST') {
      const body = await request.json()
      const { providerUrl, username, password } = body

      if (!providerUrl || !username || !password) {
        return new Response(JSON.stringify({ error: 'Faltan datos' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      // Hacer la petición al servidor IPTV para validar
      const playlistUrl = `${providerUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`
      const iptvResponse = await fetch(playlistUrl, {
        headers: { 'User-Agent': 'Retlix/1.0' },
      })

      if (!iptvResponse.ok) {
        return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const playlist = await iptvResponse.text()
      return new Response(JSON.stringify({ success: true, playlist }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ error: `Ruta no encontrada: ${path}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
