import crypto from 'crypto';

export const verifyTelegramData = (authHeader: string | undefined): { isValid: boolean; user?: any } => {
  if (!authHeader) return { isValid: false };

  const initData = authHeader.replace('twa ', '');
  
  // ДОЗВОЛЯЄМО ТЕСТОВИЙ ВХІД ДЛЯ ЛОКАЛКИ
  if (initData === 'test') {
    return { isValid: true, user: { id: 1099007629 } }; // Твій реальний TG ID
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const keys = Array.from(urlParams.keys()).filter(k => k !== 'hash').sort();
    const dataCheckString = keys.map(k => `${k}=${urlParams.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN!)
      .digest();
    
    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hmac === hash) {
      const user = JSON.parse(urlParams.get('user') || '{}');
      return { isValid: true, user };
    }
  } catch (e) {
    console.error("Auth error:", e);
  }

  return { isValid: false };
};