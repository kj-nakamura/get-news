async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      ...options.headers,
    }
  });
  clearTimeout(id);
  return response;
}

export async function fetchNoteArticleTitles(targetUrl) {
  try {
    // Extract creator ID from URL (e.g., https://note.com/ceotama -> ceotama)
    // Handle both https://note.com/ceotama and https://note.com/ceotama/magazines/...
    const urlObj = new URL(targetUrl);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
    
    // Assuming the first path part is the creator ID for user pages
    const creatorId = pathParts[0];

    if (!creatorId) {
      throw new Error(`Could not extract creator ID from URL: ${targetUrl}`);
    }

    console.log(`🔍 Target Creator ID: ${creatorId}`);

    // Randomize page to pick older articles sometimes (1 to 30)
    // If we pick a page with no content, we'll fallback to page 1
    let page = Math.floor(Math.random() * 30) + 1;
    let titles = await fetchTitlesFromApi(creatorId, page);

    // Retry with page 1 if random page yielded no results
    if (titles.length === 0 && page !== 1) {
      console.log(`⚠️ Page ${page} was empty. Falling back to Page 1.`);
      titles = await fetchTitlesFromApi(creatorId, 1);
    }

    // Additional filtering (just in case API returns non-note items, though ?kind=note helps)
    const ignorePatterns = [
        '定期購読マガジン', 
        'メンバーシップ', 
        '仕事依頼',
        'プロフィール', // Often pinned, might want to exclude
        'サイトマップ'
    ];

    const cleanTitles = titles.filter(t => {
        return !ignorePatterns.some(pattern => t.includes(pattern));
    });

    console.log(`✅ Fetched ${cleanTitles.length} titles from Page ${titles.length > 0 ? page : 1}`);
    return cleanTitles;

  } catch (error) {
    console.error(`Error fetching from note.com API: ${error.message}`);
    return [];
  }
}

async function fetchTitlesFromApi(creatorId, page) {
  const apiUrl = `https://note.com/api/v2/creators/${creatorId}/contents?kind=note&page=${page}`;
  console.log(`📡 Fetching API: ${apiUrl}`);

  const response = await fetchWithTimeout(apiUrl);
  if (!response.ok) {
    console.warn(`API Fetch Failed: ${response.status} ${response.statusText}`);
    return [];
  }

  const json = await response.json();
  const contents = json.data?.contents || [];

  return contents.map(item => item.name).filter(Boolean);
}