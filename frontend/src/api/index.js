const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function uploadDocument(formData) {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function scrapeWebsite({ url }) {
  const res = await fetch(`${BASE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Scrape failed');
  return res.json();
}

export async function sendChatMessage({ bot_id, user_query }) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id, user_query }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function fetchBots() {
  const res = await fetch(`${BASE_URL}/bots`);
  if (!res.ok) throw new Error('Failed to fetch bots');
  return res.json();
}

export async function fetchChatHistory(bot_id) {
  const res = await fetch(`${BASE_URL}/bots/${bot_id}/history`);
  if (!res.ok) throw new Error('Failed to fetch chat history');
  return res.json();
}

// Embed API functions
export async function generateEmbedCode(bot_id) {
  const res = await fetch(`${BASE_URL}/embed/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id }),
  });
  if (!res.ok) throw new Error('Failed to generate embed code');
  return res.json();
}

export async function getEmbedTokens(bot_id) {
  const res = await fetch(`${BASE_URL}/embed/tokens/${bot_id}`);
  if (!res.ok) throw new Error('Failed to fetch embed tokens');
  return res.json();
}

export async function revokeEmbedToken(embed_token) {
  const res = await fetch(`${BASE_URL}/embed/tokens/${embed_token}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to revoke embed token');
  return res.json();
}

// Bot management functions
export async function updateBot(bot_id, data) {
  const res = await fetch(`${BASE_URL}/bots/${bot_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update bot');
  return res.json();
}

export async function deleteBot(bot_id) {
  const res = await fetch(`${BASE_URL}/bots/${bot_id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete bot');
  return res.json();
}

export async function clearBotContent(bot_id) {
  const res = await fetch(`${BASE_URL}/bots/${bot_id}/clear-content`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to clear bot content');
  return res.json();
} 