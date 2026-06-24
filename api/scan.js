export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません' });
  }

  try {
    const { image } = req.body; // base64 data URL (e.g. "data:image/jpeg;base64,...")
    if (!image) {
      return res.status(400).json({ error: '画像データがありません' });
    }

    // data URL から base64 部分だけ抽出
    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
                text: `この画像に写っているバーコード（JANコード・EANコード・UPCコード）の数字を読み取って、数字のみを返してください。
バーコードが複数ある場合は最も大きく写っているものを1つだけ返してください。
数字以外のテキスト（説明文など）は一切含めないでください。
バーコードが見つからない場合は「NOT_FOUND」とだけ返してください。`
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: `Gemini APIエラー: ${geminiRes.status}`, detail: errText });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!rawText || rawText === 'NOT_FOUND') {
      return res.status(200).json({ janCode: null, message: 'バーコードが見つかりませんでした' });
    }

    // 数字のみ抽出（余分な文字を除去）
    const janCode = rawText.replace(/\D/g, '');

    if (janCode.length < 8 || janCode.length > 14) {
      return res.status(200).json({ janCode: null, message: `認識結果が不正です: ${rawText}` });
    }

    return res.status(200).json({ janCode });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
