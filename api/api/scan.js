export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, gemini_key } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'image is required' });
  }

  // GeminiキーはリクエストボディかEnvironment Variablesから取得
  const apiKey = gemini_key || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const prompt = `この画像にバーコードが写っている場合、JANコード（EANコード）の数字を読み取ってください。
バーコードが写っていない場合は、商品名や特徴を日本語で説明してください。
以下のJSONのみを返してください：
{"jan_code": "読み取ったJANコードの数字のみ（読み取れない場合はnull）", "product_hint": "商品のヒント（わかる場合）", "confidence": "高・中・低"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: image } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const text = data.candidates[0].content.parts[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('解析できませんでした');
    
    const result = JSON.parse(match[0]);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
