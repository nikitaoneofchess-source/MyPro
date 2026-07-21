import { Keyboard, InlineKeyboard } from 'grammy';

// Клавіатура для тренера
export const coachKeyboard = new Keyboard()
  .text('🗓 Розклад на сьогодні').text('👥 Мої клієнти')
  .row()
  .text('🔗 Моє посилання').webApp('🖥 Особистий кабінет', 'https://my-pro-frontend-eight.vercel.app/')
  .resized();

// Клавіатура для клієнта
export const clientKeyboard = new Keyboard()
  .text('📅 Наступне тренування')
  .row()
  .text('👨‍🏫 Мій тренер').text('Допомога')
  .resized();

// Інлайнова кнопка для підтвердження тренування
export const createConfirmationKeyboard = (sessionId: string) => {
  return new InlineKeyboard()
    .text("✅ Буду", `confirm_${sessionId}`)
    .text("❌ Не зможу", `reject_${sessionId}`);
};