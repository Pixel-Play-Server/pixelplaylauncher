addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  const url = new URL(request.url)
  // Expecting path like /releases-v2/<channel>/<arch>/<version>/manifest.json
  const key = url.pathname.replace(/^\//, '') // remove leading /
  // R2 binding name: UPDATER_BUCKET
  try {
    const obj = await UPDATER_BUCKET.get(key)
    if (!obj) return new Response('Not Found', { status: 404 })
    const body = await obj.arrayBuffer()
    const headers = new Headers()
    headers.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream')
    return new Response(body, { status: 200, headers })
  } catch (e) {
    return new Response('Error fetching from R2: ' + e.toString(), { status: 500 })
  }
}
