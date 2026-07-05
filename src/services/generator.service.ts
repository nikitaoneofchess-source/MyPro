import { addDays, format, startOfDay, addMinutes } from 'date-fns';
import { ScheduleTemplate, IScheduleTemplate } from '../models/ScheduleTemplate.js';
import { TrainingSession } from '../models/TrainingSession.js';

// ДОДАНО: тепер функція може приймати один конкретний шаблон
export const generateSessionsFromTemplates = async (specificTemplate?: IScheduleTemplate) => {
  console.log('🔄 Запуск генерації тренувань...');
  
  // Якщо передали один шаблон - працюємо з ним, якщо ні - беремо всі активні з бази
  const templates = specificTemplate 
    ? [specificTemplate] 
    : await ScheduleTemplate.find({ isActive: true });

  const today = startOfDay(new Date());
  const horizon = addDays(today, 21); // Генеруємо на 3 тижні вперед для зручності

  for (const template of templates) {
    for (const dayOfWeek of template.daysOfWeek) {
      let currentDate = today;
      
      while (currentDate <= horizon) {
        // currentDate.getDay() повертає: 0-Нд, 1-Пн, 2-Вт...
        // Порівнюємо з днями в шаблоні (обробляємо випадок 7 як 0 для Неділі)
        if (currentDate.getDay() === (dayOfWeek % 7)) {
          
          const [hours, minutes] = template.startTime.split(':').map(Number);
          const startAt = new Date(currentDate);
          startAt.setHours(hours || 0, minutes || 0, 0, 0);

          const endAt = addMinutes(startAt, template.duration);

          const exists = await TrainingSession.findOne({
            coachId: template.coachId,
            clientId: template.clientId,
            startAt: startAt
          });

          if (!exists) {
            await TrainingSession.create({
              coachId: template.coachId,
              clientId: template.clientId,
              templateId: template._id,
              startAt,
              endAt,
              status: 'planned'
            });
            console.log(`✅ Створено заняття: ${template.clientId} на ${format(startAt, 'yyyy-MM-dd HH:mm')}`);
          }
        }
        currentDate = addDays(currentDate, 1);
      }
    }
  }
  console.log('✅ Генерацію завершено');
};