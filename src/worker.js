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
    // POST /api/provider - Recibir URL M3U del frontend
    if (path === '/api/provider' && request.method === 'POST') {
      const body = await request.json()

      // El frontend envía: { type: "m3u", m3u_url: "http://..." }
      const m3uUrl = body.m3u_url || body.providerUrl || body.url

      if (!m3uUrl) {
        return new Response(JSON.stringify({ error: 'Falta la URL del M3U' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      // Limpiar espacios en blanco
      const cleanUrl = m3uUrl.trim()

      // Hacer la petición al servidor IPTV para obtener el playlist
      const iptvResponse = await fetch(cleanUrl, {
        headers: { 'User-Agent': 'Retlix/1.0' },
      })

      if (!iptvResponse.ok) {
        return new Response(JSON.stringify({ error: `Error del proveedor IPTV: ${iptvResponse.status}` }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const playlist = await iptvResponse.text()

      // Verificar que la respuesta sea un M3U válido
      if (!playlist.startsWith('#EXTM3U')) {
        return new Response(JSON.stringify({ error: 'Respuesta inválida del proveedor IPTV' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

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
