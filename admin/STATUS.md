# Admin портфолио — статус (рабочее, inline-режим, 2026-05-08)

Цель: менять любую картинку на сайте кликом по ✏️ прямо на странице, без правки кода.

## Архитектура

**Inline-режим редактирования** (вместо отдельной admin-страницы со списком всех слотов).
Один общий скрипт [assets/admin-inline.js](../assets/admin-inline.js) подключён на всех страницах. Если в `localStorage` сохранены S3-ключи — на каждой картинке с атрибутом `data-editable="<S3 key>"` появляются кнопки ✏️ (заменить) и 🗑 (удалить). Для обычного посетителя сайта скрипт молча выходит, никаких кнопок нет.

**Точка входа:** [admin-x7k3.html](../admin-x7k3.html) — секретная страница логина (3 шага: пароль → S3 ключи → активная сессия). Пароль `moiseev2026`, хеш SHA-256 захардкожен. После активации можно ходить по сайту и редактировать любую картинку.

**Сессия:** S3-ключи живут в `localStorage` браузера, никуда не отправляются (кроме самого S3 при upload/delete). Кнопка «Выйти» в верхней панели стирает ключи и закрывает сессию.

## Схема имён файлов на S3

```
Moiseev/
├── profile.jpg                                       # фото Александра
├── projects.json                                     # manifest для projects.html (опционально)
└── portfolio/
    └── <slug>/
        ├── <slug>_cover.png                          # заставка (projects.html карточка + index.html featured + страница проекта showcase)
        ├── <slug>_screenshot-1.png                   # скриншот 1 в галерее проекта
        ├── <slug>_screenshot-2.png                   # скриншот 2
        └── <slug>_screenshot-3.png                   # скриншот 3
```

Slug проекта повторяется в имени файла, чтобы при выгрузке каждый файл оставался самодостаточным.

**Один файл — много мест.** `portfolio/billiard/billiard_cover.png` показывается одновременно в:
- карточке `projects.html`
- featured-блоке `index.html` (если проект в featured)
- showcase на `projects/billiard.html`

Замена обложки в любом из этих мест → файл на S3 перезаписывается → все 3 точки автоматически показывают новую (после сброса браузерного кэша; локально сразу через `?t=<timestamp>`).

## Конфигурация Beget S3

| Параметр | Значение |
|----------|----------|
| Endpoint | `https://s3.ru1.storage.beget.cloud` |
| Bucket | `5a0ee524b59d-s3-storage` |
| Регион | `ru1` |
| **CORS** | Настроены 2 правила: `https://portfolio.aisob.ru` и `http://127.0.0.1:5500` (см. cp.beget.com → Object Storage → бакет → CORS) |
| Ключи | См. `e:\Claude Code\ACCESS.md` → раздел "Beget S3 Object Storage" |

## Что делать при добавлении нового проекта

1. Создать `projects/<new-slug>.html` (можно по шаблону `billiard.html`).
2. На каждом `<img>`:
   - `src="https://s3.ru1.storage.beget.cloud/5a0ee524b59d-s3-storage/Moiseev/portfolio/<new-slug>/<new-slug>_cover.png"`
   - `data-editable="Moiseev/portfolio/<new-slug>/<new-slug>_cover.png"`
   - аналогично для `screenshot-1/2/3.png` и `data-full` у `.gallery-item`.
3. Подключить `<script type="module" src="../assets/admin-inline.js" defer></script>`.
4. Добавить запись в массив `projects[]` в [projects.html](../projects.html) (с `slug` для фильтрации).
5. Если проект надо в featured на главной — добавить в массив `featuredCases[]` в [index.html](../index.html) (нужен `slug`, остальные поля по аналогии).
6. Перевести строки в `locales/*.json`.
7. Открыть страницу в режиме редактирования и залить картинки через ✏️.

## Скрипты в admin/ (одноразовые, можно удалить)

| Файл | Назначение |
|------|-----------|
| [migrate_s3.py](migrate_s3.py) | Самая первая миграция cover.png в латинские пути (отработал) |
| [refactor_inline.py](refactor_inline.py) | Перевод всех HTML на латинские пути + добавление `data-editable` + подключение admin-inline.js (отработал) |
| [migrate_inline_s3.py](migrate_inline_s3.py) | Копирование старых кириллических файлов на новые латинские пути (отработал) |
| [cleanup_cyrillic_s3.py](cleanup_cyrillic_s3.py) | Удаление старых кириллических файлов с S3 (отработал, PDF оставлен) |
| [rename_with_slug_prefix.py](rename_with_slug_prefix.py) | Переименование `cover.png` → `<slug>_cover.png` и `screenshot-N.png` → `<slug>_screenshot-N.png` (отработал) |

Эти скрипты можно сохранить как референс, либо удалить.

## Известные нюансы

- Пустые слоты на странице (нет картинки на S3) показывают заглушку «📷 Нажмите ✏️ чтобы загрузить» — её видит только админ.
- На странице `holy-scriptures.html` нет блока галереи (только showcase), это исторически.
- Кириллический PDF `Moiseev/Портфолио/Нейросотрудник HR.pdf` оставлен на S3 — в коде сайта не используется.
- Скриншоты для `billiard` потеряны при миграции (HTML был обновлён вручную раньше других, новые пути не пересеклись со старыми кириллическими исходниками). Нужно загрузить заново через inline-режим.

## Возможные расширения

- [ ] Кнопка «Создать новый проект» в админке — форма для добавления записи в `projects.json` без правки HTML вручную.
- [ ] Конвертация PNG → WebP при загрузке (текущие PNG по 1-2.5 МБ — заметно тяжелы).
- [ ] CDN — Cloudflare поверх S3 с поддоменом `cdn.aisob.ru`.
- [ ] Поменять admin-пароль: пересчитать `sha256` нового пароля и подменить `PASSWORD_HASH` в `admin-x7k3.html` и `assets/admin-inline.js`.
- [ ] Open Graph теги (`og:image`, `og:description`).
