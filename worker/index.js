const MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // 2 MB
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;  // 10 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm',
]);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const authHeader = request.headers.get('X-Upload-Secret');
    if (!env.UPLOAD_SECRET || authHeader !== env.UPLOAD_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (request.method === 'POST') {
      return handleUpload(request, env);
    }

    if (request.method === 'DELETE') {
      return handleDelete(request, env);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  },
};

async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return jsonResponse({ error: 'No file provided' }, 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse({ error: `Unsupported file type: ${file.type}` }, 400);
    }

    const isVideoFile = file.type.startsWith('video/');
    const maxBytes = isVideoFile ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      const limitMB = (maxBytes / (1024 * 1024)).toFixed(0);
      return jsonResponse({ error: `File too large (max ${limitMB}MB)` }, 413);
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      .substring(0, 60);
    const key = `${safeName}_${timestamp}.${ext}`;

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `${env.PUBLIC_BUCKET_URL}/${encodeURIComponent(key)}`;

    return jsonResponse({ url: publicUrl, key }, 200);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDelete(request, env) {
  try {
    const { keys } = await request.json();
    if (!Array.isArray(keys) || keys.length === 0) {
      return jsonResponse({ error: 'No keys provided' }, 400);
    }

    const results = [];
    for (const key of keys) {
      await env.BUCKET.delete(key);
      results.push(key);
    }

    return jsonResponse({ deleted: results }, 200);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Secret',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
