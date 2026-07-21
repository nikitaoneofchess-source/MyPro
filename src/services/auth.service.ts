import crypto from 'crypto';

export const verifyTelegramData = (initData: string): { isValid: boolean; user?: any } => {
  if (!initData) return { isValid: false };

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  const data: any = {};
  
  // Збираємо всі поля крім hash і сортуємо їх
  const keys = Array.from(urlParams.keys()).filter(k => k !== 'hash').sort();
  const dataCheckString = keys.map(k => `${k}=${urlParams.get(k)}`).join('\n');

  // Створюємо секретний ключ на основі BOT_TOKEN
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN!).digest();
  
  // Рахуємо хеш
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac === hash) {
    const user = JSON.parse(urlParams.get('user') || '{}');
    return { isValid: true, user };
  }

  return { isValid: false };
};