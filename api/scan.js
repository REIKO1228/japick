export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: '画像データがありません' });
    }

    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    // 新しいエンドポイント (v1 + gemini-2.0-flash)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              },
              {
                text: `画像の中にバーコードがあります。バーコードのすぐ下に印刷されている数字を全桁読んでください。途中で止まらず必ず最後まで読んでください。数字のみを返してください。例：4901670110227バーコードは横向きや斜めになっている場合があります。どの向きでも構いません。バーコードの数字を読み取り、13桁または8桁の数字のみを返してください。数字以外は一切返さないでください。バーコードが全く見つからない場合のみ「NOT_FOUND」と返してください。`
              }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 32
          }
        })
      }
    );

    // エラー詳細をログに出す
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return res.status(502).json({ error: `Gemini APIエラー: ${geminiRes.status}`, detail: errText });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    console.log('Gemini rawText:', rawText);

    if (!rawText || rawText === 'NOT_FOUND') {
      return res.status(200).json({ janCode: null, message: 'バーコードが見つかりませんでした' });
    }

    const janCode = rawText.replace(/\D/g, '');

    if (janCode.length < 8 || janCode.length > 14) {
      return res.status(200).json({ janCode: null, message: `認識結果が不正です: ${rawText}` });
    }

    return res.status(200).json({ janCode });
  } catch (e) {
    console.error('scan.js catch:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
