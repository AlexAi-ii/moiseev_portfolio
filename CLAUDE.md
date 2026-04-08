# CLAUDE.md — moiseev_portfolio (Александр Моисеев)

## Описание

Сайт-портфолио на GitHub Pages — статический HTML/CSS/JS с мультиязычностью (6 языков).
**GitHub:** https://github.com/AlexAi-ii/moiseev_portfolio
**Домен:** https://portfolio.aisob.ru

## Мультиязычность (i18n)

### Поддерживаемые языки
- **ru** (Русский) — язык по умолчанию
- **en** (English), **de** (Deutsch), **fr** (Français), **it** (Italiano), **es** (Español)

### Как работает
1. **i18n.js** — ядро локализации. Загружает `locales/{lang}.json` и переводит все элементы с `data-i18n` атрибутами.
2. **Локаль определяется:** localStorage → URL `?lang=X` → timezone → geo API (ipapi.co) → fallback на `en`.
3. **Дропдаун** в навигации для ручного переключения. Язык сохраняется в `localStorage`.
4. **Промис `window._moiLocaleLoaded`** — разрешается когда locale JSON загружен. JS-рендер карточек ждёт его.
5. **Событие `moi:langchange`** — диспатчится при смене языка, триггерит re-render JS-карточек.
6. **`_moiResolve(key)`** — глобальная функция для получения перевода по ключу.

### Структура locale файлов (`locales/{lang}.json`)
```json
{
  "nav": { "brand": "...", "tagline": "...", "home": "...", "contact": "..." },
  "common": { "backLink": "...", "footer": "...", "ctaBtn": "...", "ctaDiscuss": "...", "contactVK": "VKontakte" },
  "index": { "heroTitle": "...", "contactTitle": "...", "contactMax": "MAX", "contactVK": "VKontakte", "skillBots1": "..." },
  "projects": {
    "title": "...", "filterAll": "...", "catAIBots": "AI-Bots",
    "projects": [
      { "name": "Billiard Bot", "desc": "Telegram bot...", "metric": "40% admin load reduction" }
      // ... 15 проектов
    ]
  },
  "projectsPages": {
    "backToHome": "← Back to Home",
    "psrProblem": "Problem", "psrSolution": "Solution", "psrResult": "Result",
    "featuresTitle": "Features", "featuresTitleBot": "Bot Features",
    "technologies": "Technologies", "materialsGallery": "Materials and Screenshots",
    "billiard": {
      "title": "Billiard Bot", "subtitle": "Telegram bot...", "alt": "...",
      "psr": { "problem": "...", "solution": "...", "result": "..." },
      "features": { "heading": "Bot Features", "cards": [ { "title": "...", "desc": "..." }, ... ] },
      "gallery": { "heading": "...", "captions": ["...", "...", "..."] },
      "tech": { "heading": "...", "items": [ { "name": "...", "desc": "..." } ] },
      "cta": { "title": "...", "desc": "..." },
      "showcase": { "0": { "value": "24/7", "label": "Ready" }, "1": {...}, "2": {...}, "3": {...} }
    }
    // ... 15 проектов
  }
}
```

### Ключевые паттерны
- **data-i18n** — для HTML элементов: `<span data-i18n="common.footer">Текст</span>`
- **JS-рендер** — через `window._moiResolve('projects.projects.0.name')`
- **Ключи PSR:** `projectsPages.psrProblem/Solution/Result` (общие), `projectPages.KEY.psr.problem/solution/result` (описания)
- **Ключи showcase:** `projectPages.KEY.showcase.N.value` и `.showcase.N.label`
- **Emoji НЕ в locale** — остаются в HTML, locale содержит только текст

### Известные нюансы
- **Абсолютный путь** для locale: `/locales/en.json` (не `locales/en.json`) — важно для подстраниц в `projects/`
- **RU = default** — `i18n.js` не загружает `ru.json`, использует русский текст из HTML напрямую
- **Duplicate `i18n.js`** — никогда не подключать дважды (ломает дропдаун и state)
- **PSR headings:** `<h3>⚠️ <span data-i18n="projectsPages.psrProblem">Проблема</span></h3>` — эмодзи вне span

## Структура проекта

```
moiseev_portfolio/
├── index.html              # Главная страница (hero, about, skills, portfolio carousel, contacts)
├── resume-full.html        # Полное резюме (опыт работы, образование, навыки, CTA)
├── projects.html           # Галерея всех проектов с фильтрацией по категориям
└── projects/
    ├── billiard.html       # Бильярд бот (ШАБЛОН)
    ├── assistant.html      # Личный помощник
    ├── autopublish.html    # Авто-публикация
    ├── amp.html            # AUDIO MinusPlus
    ├── hr-neuro.html       # Нейросотрудник HR
    ├── aurpak.html         # Аюрпак
    ├── lenremont.html      # Ленремонт
    ├── mchs.html           # МЧС (ассистент для подготовки КП)
    ├── zzok-sale.html      # ZZOK Sale
    ├── zzok-hr.html        # ZZOK HR
    ├── smm-bot.html        # SMM-бот
    ├── biohacking.html     # Биохакинг
    ├── salon.html          # Салон красоты
    ├── payments.html       # Контроль платежей
    └── holy-scriptures.html # День с молитвой (Вырицкий молитвослов)
```

## Шаблон страницы проекта (projects/*.html)

**Файл-шаблон:** `projects/billiard.html`

### Структура страницы:

1. **Header** (навигация)
2. **Hero секция:**
   - Кнопка "← Назад к проектам"
   - Бейдж категории (AI-боты/HR/Платежи/Интеграции/Приложения)
   - Заголовок проекта
   - Подзаголовок (описание)
   - Project Showcase (фото + 4 карточки статистики)
3. **Problem/Solution/Result** (3 карточки)
4. **Возможности** (6 карточек с иконками)
5. **Технологии** (5-6 технологий)
6. **Материалы и скриншоты** (галерея 3 фото + lightbox)
7. **CTA блок** (кнопка Telegram)
8. **Footer**

### Шаблоны HTML

**Project Showcase (статистика):**

```html
<div class="project-showcase" data-aos="zoom-in" data-tilt>
  <div class="showcase-stats">
    <div class="showcase-stat">
      <span class="value">24/7</span>
      <span class="label">Режим работы</span>
    </div>
    <div class="showcase-stat">
      <span class="value">-40%</span>
      <span class="label">Звонков админу</span>
    </div>
    <div class="showcase-stat">
      <span class="value">2 мин</span>
      <span class="label">Время брони</span>
    </div>
    <div class="showcase-stat">
      <span class="value">0₽</span>
      <span class="label">Простой</span>
    </div>
  </div>
  <div class="showcase-image-wrapper">
    <img src="URL_ФОТО" alt="Название">
  </div>
</div>
```

**Problem/Solution/Result:**

```html
<section class="section-card" data-aos="fade-up">
  <div class="psr-grid">
    <div class="psr-box problem">
      <span class="psr-icon">⚠️</span>
      <h3>Проблема</h3>
      <p>Описание проблемы...</p>
    </div>
    <div class="psr-box solution">
      <span class="psr-icon">💡</span>
      <h3>Решение</h3>
      <p>Описание решения...</p>
    </div>
    <div class="psr-box result">
      <span class="psr-icon">📈</span>
      <h3>Результат</h3>
      <p>Описание результата...</p>
    </div>
  </div>
</section>
```

**Галерея скриншотов (lightbox):**

```html
<section class="section-card gallery-section" data-aos="fade-up">
  <h2><span class="icon">🖼️</span> Материалы и скриншоты</h2>
  <div class="gallery-grid">
    <div class="gallery-item" data-full="URL_ПОЛНОЕ_ФОТО" data-caption="Подпись">
      <img src="URL_ФОТО" alt="Описание">
      <div class="gallery-caption">Краткая подпись</div>
    </div>
  </div>
</section>

<!-- Lightbox Modal -->
<div class="lightbox" id="lightbox">
  <span class="lightbox-close">&times;</span>
  <img class="lightbox-content" id="lightbox-img" alt="">
  <div class="lightbox-caption" id="lightbox-caption"></div>
</div>
```

**JavaScript для lightbox:**

```javascript
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const galleryItems = document.querySelectorAll('.gallery-item');

galleryItems.forEach(item => {
  item.addEventListener('click', function() {
    lightboxImg.src = this.getAttribute('data-full');
    lightboxCaption.textContent = this.getAttribute('data-caption');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}
```

**Общий шаблон страницы проекта:**

```html
<header>...</header>
<main class="case-hero">
  <a href="../projects.html" class="back-link">← Назад к проектам</a>
  <div class="case-badge">КАТЕГОРИЯ</div>
  <h1 class="case-title">Название</h1>
  <p class="case-subtitle">Описание</p>
</main>
<div class="case-content">
  <section class="section-card">Problem/Solution/Result</section>
  <section class="section-card">Возможности (6 карточек)</section>
  <section class="section-card">Технологии (4-6)</section>
  <div class="cta-box">CTA с кнопкой Telegram</div>
</div>
<footer>...</footer>
```

### Цвета бейджей категорий

```css
/* AI-боты */
.category-badge.ai-bot { background: linear-gradient(135deg, #7f5af0, #5a37d8); }
/* HR */
.category-badge.hr { background: linear-gradient(135deg, #2cb67d, #1a9466); }
/* Платежи */
.category-badge.payment { background: linear-gradient(135deg, #f5a623, #d97706); }
/* Интеграции */
.category-badge.integration { background: linear-gradient(135deg, #00b7ff, #0095cc); }
/* Приложения */
.category-badge.app { background: linear-gradient(135deg, #f05a5a, #d83737); }
```

## Цветовая схема (CSS Variables)

```css
:root {
  --bg: #1a1f2e;              /* Основной фон */
  --surface: #252b3d;         /* Поверхности карточек */
  --surface-2: #2d3548;       /* Вторичные поверхности */
  --dark: #0f141f;            /* Тёмный фон */
  --text: #ffffff;            /* Основной текст */
  --muted: #a0aec0;           /* Приглушённый текст */
  --primary: #7f5af0;         /* Основной фиолетовый */
  --primary-2: #5a37d8;       /* Тёмный фиолетовый */
  --accent: #2cb67d;          /* Зелёный акцент */
  --accent-2: #00b7ff;        /* Голубой акцент */
  --line: rgba(127, 90, 240, 0.2);  /* Границы */
  --shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 20px 60px rgba(127, 90, 240, 0.25);
  --shadow-xl: 0 30px 80px rgba(127, 90, 240, 0.35);
  --glow: 0 0 40px rgba(127, 90, 240, 0.4);
  --radius-xl: 28px;
  --radius-lg: 20px;
  --radius-md: 14px;
  --container: 1200px;
}
```

## Библиотеки

| Библиотека | CDN | Назначение |
|------------|-----|------------|
| AOS (Animate On Scroll) | `https://unpkg.com/aos@2.3.1/dist/aos.css` | Анимации при скролле |
| vanilla-tilt.js | `https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js` | 3D tilt эффект на карточках |
| Google Fonts (Manrope) | `https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap` | Шрифт |

## Эффекты

- Анимированные частицы на фоне (50 частиц, `@keyframes float`)
- Progress bar чтения страницы (фиксируется вверху)
- 3D tilt эффект на карточках (vanilla-tilt)
- Hover эффекты с `transform` и `box-shadow`
- Градиентные фоны и текст
- Smooth scroll, backdrop-filter blur
- Shimmer анимация на skill карточках

## Страницы

### index.html — Главная

| Секция | Описание |
|--------|----------|
| Hero | "AI-разработчик & аналитик", подзаголовок про n8n/Python/нейросети |
| Stats | 15+ проектов, 1166+ часов, 8000+ откликов, 29 лет опыта |
| About | Фото + текст про 29-летний опыт, n8n, Claude Code |
| Skills | 6 категорий: Чат-боты, AI-ассистенты, Промпт-инженерия, Интеграции, Базы данных, Платформы |
| Portfolio | Carousel с 15 проектами (drag-to-scroll, auto-scroll, slider) |
| Contact | Телефон, email, Telegram, MAX, VK |

### resume-full.html — Резюме

| Секция | Описание |
|--------|----------|
| Header | Фото, заголовок, теги (29 лет в ИТ, 1С 20+ лет, n8n 2+ года) |
| Опыт работы | 9 мест работы (1996 — н.в.) |
| Образование | СПбГУТЭС, 1998 — Экономист-менеджер |
| Квалификация | Тендеры (2024), Менеджер по финансам (1996) |
| Навыки | 6 категорий с описанием |
| Дополнительно | О себе, личные качества, водительские права B |
| CTA | Кнопка "Написать в Telegram" |

### projects.html — Все проекты

- **Фильтрация по категориям:** AI-боты, HR, Платежи, Интеграции, Приложения
- **Карточки:** 15 проектов с фото, описанием, метрикой
- **Статистика:** 15+ проектов, 5 категорий, 1166+ часов экономии, 100% результат

## Список проектов (15)

| Проект | Категория | Описание | Ключевая метрика |
|--------|-----------|----------|------------------|
| Бильярд бот | AI-боты | Telegram-бот для бронирования столов | Снижение нагрузки на 40% |
| Личный помощник | AI-боты | AI-планировщик в Telegram с голосовым управлением | Экономия 2+ часов в день |
| Авто-публикация | AI-боты | Посты в Telegram из ссылок автоматически | Экономия 5 часов в неделю |
| AUDIO MinusPlus | Платежи | Разделение треков на стемы с оплатой | Полная автоматизация |
| Нейросотрудник HR | HR | 8000+ откликов, 1166 часов экономии | 8000+ откликов, 1166 ч |
| Аюрпак | Интеграции | Бот-консультант для производителя пакетов | Быстрый входящий контур |
| Ленремонт | AI-боты | AI-консультант по ремонту с калькулятором | Меньше потерянных заявок |
| МЧС | AI-боты | Ассистент для подготовки КП | Быстрее КП, меньше ошибок |
| ZZOK Sale | AI-боты | Бот-продавец для прогрева клиентов | Прогретые лиды |
| ZZOK HR | HR | База знаний и тесты для сотрудников | Ускорение адаптации |
| SMM-бот | HR | Контент-календарь для beauty-мастеров | Экономия 10 часов в неделю |
| Биохакинг | AI-боты | AI-консультант с базой знаний по биохакингу | Монетизация экспертизы |
| Салон красоты | Интеграции | Запись клиентов + интеграция с 1С | Сокращение работы админа |
| Контроль платежей | Платежи | Напоминания о долгах в Telegram/WhatsApp | Снижение просрочки |
| День с молитвой | Приложения | Вырицкий молитвослов — ежедневное приложение | Ежедневная молитва |

## Навыки (6 категорий)

### Чат-боты
- Telegram, VK, MAX, WhatsApp боты
- С базами данных
- Парсинг данных, автопостинг
- Воронки продаж, бронирование
- Приём оплаты

### AI-ассистенты, AI-консультанты
- Помощники и ассистенты с базой знаний (RAG)
- Генерация статей, автопостинг в блог
- Консультанты, поддержка на LLM
- Анализ звонков, саммари встреч
- Интеграции с CRM, 1С

### Промпт-инженерия
- Разработка и оптимизация промптов
- Повышение эффективности LLM
- Тестирование гипотез, A/B тесты
- Системные промпты для AI-ассистентов

### Интеграции
- CRM: Битрикс24
- 1С, hh.ru, Авито
- Платежные системы (Робокасса, Юкасса, CloudPayments, Prodamus)
- Внешние API, вебхуки, MCP

### Базы данных
- Supabase (PostgreSQL)
- Vector Store (векторный поиск), RAG
- Google Sheets, Google Drive
- Хранение: пользователей, диалогов, контекста

### Платформы и каналы
- n8n (workflow automation)
- Telegram, VK, MAX, WhatsApp
- Wazzup, Chat2Desk, ChatApp
- LLM: OpenAI, Claude, DeepSeek, GigaChat, Qwen, YandexGPT

## Опыт работы

| Период | Должность | Компания |
|--------|-----------|----------|
| Ноя 2024 — н.в. | Разработчик / аналитик | Фриланс |
| Дек 2024 — Янв 2025 | Аналитик-консультант | КодерЛайн |
| Ноя 2023 — Ноя 2024 | Руководитель направления | ООО «Трисс логистика» |
| Июль 2015 — Окт 2023 | Руководитель ИТ-отдела | ООО «РТК» (5000+ чел.) |
| Янв 2008 — Июль 2015 | Руководитель ИТ-отдела | ООО «Немецкая марка» |
| Апр 2007 — Дек 2007 | Руководитель проекта | ООО «Контакт» |
| Фев 2005 — Март 2007 | Руководитель проектов | ООО «Петродиск» |
| Фев 1998 — Янв 2005 | Генеральный директор | ООО «911С» (1С:Франчайзи) |
| Ноя 1996 — Дек 1997 | Менеджер по продажам, программист | ООО «Трэйкер» |

## S3 хранилище изображений

```
https://s3.ru1.storage.beget.cloud/5a0ee524b59d-s3-storage/Moiseev%2F
```

### Фото портфолио проектов
```
https://s3.ru1.storage.beget.cloud/5a0ee524b59d-s3-storage/Moiseev%2F%D0%9F%D0%BE%D1%80%D1%82%D1%84%D0%BE%D0%BB%D0%B8%D0%BE%2F
```

### Фото владельца
```
https://s3.ru1.storage.beget.cloud/5a0ee524b59d-s3-storage/Moiseev%2FMoiseev.JPG
```

## Контакты

| Контакт | URL / Значение |
|---------|----------------|
| **Telegram** | https://t.me/avmoiseevspb |
| **MAX** | https://max.ru/u/f9LHodD0cOL9D1QBbAqai6N2XjZQqq_3m9Tk0fGgkLsTrUmzuNi4ax9rsP8 |
| **VK** | https://vk.com/a.moiseev76 |
| **Телефон** | +7 911 765-39-05 |
| **Email** | a203@list.ru |

## Адаптивность

| Breakpoint | Описание |
|------------|----------|
| `max-width: 900px` | About → 1 колонка |
| `max-width: 768px` | Навигация вертикально, stats 2 колонки, карточки 1 колонка |
| `max-width: 480px` | Stats 1 колонка, уменьшенные элементы |

## Команды для разработки

```bash
# Открыть портфолио в браузере
start moiseev_portfolio/index.html

# Проверить все файлы
ls moiseev_portfolio/
ls moiseev_portfolio/projects/
```

## Важные заметки

1. **Все страницы в едином стиле** — одинаковые CSS variables, шрифты, эффекты
2. **Адаптивность** — media queries для мобильных (768px, 480px)
3. **Доступность** — alt тексты для изображений, семантическая вёрстка
4. **Производительность** — lazy loading для изображений
5. **SEO** — meta description, Open Graph теги
6. **GitHub Pages** — деплой через push в `main` ветку
