import { useState } from 'react';
import axios from 'axios';

function ProjectForm({ setProjects, closeModal }) {
  const [formData, setFormData] = useState({
    name: '',
    systemPrompt: `Ты — эксперт по созданию SEO-оптимизированных, современных одностраничных HTML-сайтов для PBN. Создай полноценный index.html файл, включающий HTML, CSS (в теге <style>) и JavaScript (в теге <script>) для темы казино и гемблинга на английском языке. Страница должна выглядеть как профессиональная статья с:
- Современным, адаптивным дизайном (responsive, mobile-first).
- Красивыми шрифтами (системные, например, Arial, без внешних зависимостей).
- Привлекательными элементами (градиенты, тени, кнопки, без изображений).
- SEO-оптимизацией (уникальные meta description, keywords, H1-H3, семантическая структура).
- Минимум 800 символов контента с ключевыми словами (casino, gambling, slots, bonuses).
- Валидным HTML5/CSS3 кодом, без ошибок.
- Без внешних зависимостей (все стили и скрипты внутри файла).

Верни только чистый код index.html в формате JSON: {"html": "<!DOCTYPE html>..."}. Не добавляй пояснений, комментариев или лишнего текста. Код должен быть готов для записи в index.html.`,
    userPrompt: `Создай index.html для PBN-страницы на тему казино и гемблинга на английском языке. Самостоятельно сгенерируй уникальную тему статьи, связанную с казино или гемблингом (например, советы, стратегии, обзоры). Включи:
- Уникальный заголовок (H1), подзаголовки (H2-H3), текст с ключевыми словами (casino, slots, bonuses, gambling).
- Адаптивный дизайн с градиентным фоном, тенями, кнопками (например, "Play Now").
- Системные шрифты (Arial или аналог, без Google Fonts).
- Простую анимацию (например, hover-эффекты на кнопках).
- Meta description (120-160 символов), keywords, без изображений.
- JavaScript для легкой интерактивности (например, модальное окно или плавный скролл).
- Контент минимум 800 символов, профессиональный и убедительный, на английском языке.
- Все стили и скрипты внутри index.html.

Верни JSON: {"html": "<!DOCTYPE html>..."}.`,
    siteCount: 1,
    interval: 30
  });
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState(''); // Для отображения исходного ввода

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token);
      if (!token) throw new Error('No token found');
      const res = await axios.post('/api/projects', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects((prev) => [
        ...prev,
        { ...formData, _id: res.data.projectId, status: 'pending', progress: [], isRunning: false }
      ]);
      setError(null);
      closeModal();
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleNumberChange = (e, field) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      [field]: value === '' ? '' : parseInt(value) || 1
    });
  };

  const formatProjectName = (name) => {
    // Транслитерация кириллицы в латиницу
    const translitMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      ' ': '-', 'ъ': '', 'ь': ''
    };
    // Убираем пробелы в начале и конце, заменяем кириллицу
    let trimmed = name.trim().toLowerCase();
    trimmed = trimmed.replace(/[а-яёъь]/g, (char) => translitMap[char] || '');
    // Убираем множественные пробелы, заменяем на тире
    const words = trimmed.split(/\s+/).filter(word => word);
    // Убираем не-латинские символы, оставляем буквы, цифры, тире
    return words.map(word => word.replace(/[^a-z0-9-]/g, '')).filter(word => word).join('-');
  };

  const handleNameChange = (e) => {
    const inputValue = e.target.value;
    setDisplayName(inputValue); // Сохраняем исходный ввод
    const formattedName = formatProjectName(inputValue);
    setFormData({ ...formData, name: formattedName });
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows="6"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User Prompt</label>
          <textarea
            value={formData.userPrompt}
            onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows="6"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Sites</label>
          <input
            type="number"
            value={formData.siteCount}
            onChange={(e) => handleNumberChange(e, 'siteCount')}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interval (seconds)</label>
          <input
            type="number"
            value={formData.interval}
            onChange={(e) => handleNumberChange(e, 'interval')}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            min="10"
            required
          />
        </div>
        <button type="submit" className="btn bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 w-full shadow-md transition-all duration-300 transform hover:scale-105">
          Create Project
        </button>
      </form>
    </div>
  );
}

export default ProjectForm;