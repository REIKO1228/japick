export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { jan, keyword } = req.query;
  
  const appid = process.env.RAKUTEN_APP_ID;
  const secret = process.env.RAKUTEN_ACCESS_KEY;
  
  if (!appid || !secret) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  try {
    const searchParam = jan 
  ? `keyword=${jan}&sort=+itemPrice&genreId=0` 
  : `keyword=${encodeURIComponent(keyword || '')}`;
    const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?format=json&applicationId=${appid}&accessKey=${secret}&${searchParam}&hits=3`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Referer': 'https://japick.vercel.app/',
        'Origin': 'https://japick.vercel.app',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        'Accept': 'application/json',
        'Accept-Language': 'ja,en;q=0.9',
      }
    });
    
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
