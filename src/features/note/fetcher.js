import cheerio from 'cheerio';

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

export async function fetchNoteArticleTitles(url) {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const titles = [];
    // note.com uses h2 for article titles on the creator page
    $('h2.m-largeNoteWrapper__title').each((i, el) => {
      titles.push($(el).text().trim());
    });

    return titles;
  } catch (error) {
    console.error(`Error fetching from note.com: ${error.message}`);
    return [];
  }
}
