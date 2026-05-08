/*
 * admin-inline.js — Inline-режим редактирования картинок портфолио.
 *
 * Подключается на ВСЕХ страницах сайта одной строкой:
 *   <script type="module" src="/assets/admin-inline.js" defer></script>
 *
 * Что делает:
 * - Если в localStorage НЕТ s3_ak/s3_sk → ничего не делает (для обычного посетителя невидим).
 * - Если ключи ЕСТЬ:
 *   · находит все элементы с атрибутом data-editable="<S3 key>"
 *   · показывает на них кнопку ✏️ при наведении
 *   · клик → file picker → загрузка файла на S3 (PUT через aws4fetch + Signature V4)
 *   · после успешной загрузки обновляет src и data-full, чтобы картинка показалась без перезагрузки
 *   · если картинка отсутствует на S3 (404) — показывает заглушку «📷 Загрузить»
 * - Сверху страницы: панелька «🔧 Режим редактирования · Выйти».
 *
 * Безопасность: ключи живут только в localStorage браузера автора. У других посетителей
 * сайта их нет → этот скрипт молча выходит, никакой UI не появляется.
 */

const BUCKET = '5a0ee524b59d-s3-storage';
const ENDPOINT = 'https://s3.ru1.storage.beget.cloud';
const REGION = 'ru1';
const PUBLIC_URL = (key) => `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;

function hasKeys() {
  return !!(localStorage.getItem('s3_ak') && localStorage.getItem('s3_sk'));
}

// ---------- стили ----------
function injectStyles() {
  if (document.getElementById('admin-inline-styles')) return;
  const css = `
    .admin-edit-wrap { position: relative; display: inline-block; }
    .admin-edit-wrap.block { display: block; }
    .admin-edit-btn, .admin-delete-btn {
      position: absolute; top: 8px; z-index: 50;
      width: 36px; height: 36px; border-radius: 50%;
      color: #fff; border: 2px solid rgba(255,255,255,0.4);
      font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px rgba(0,0,0,0.4); opacity: 0.55; transform: scale(0.9);
      transition: opacity .2s ease, transform .2s ease, background .2s ease;
      pointer-events: auto;
    }
    .admin-edit-btn { right: 8px; background: rgba(127,90,240,0.85); }
    .admin-delete-btn { right: 52px; background: rgba(240,90,90,0.85); }
    .admin-edit-wrap:hover .admin-edit-btn,
    .admin-edit-wrap:hover .admin-delete-btn { opacity: 1; transform: scale(1.05); }
    .admin-edit-btn:hover { background: rgba(127,90,240,1); transform: scale(1.15); }
    .admin-delete-btn:hover { background: rgba(240,90,90,1); transform: scale(1.15); }
    .admin-edit-btn.uploading { background: rgba(44,182,125,0.95); pointer-events: none; }
    .admin-edit-btn.error, .admin-delete-btn.error { background: rgba(255,150,0,0.95); }

    .admin-empty-overlay {
      position: absolute; inset: 0; z-index: 10;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; color: #a0aec0; font-size: 0.9rem; font-weight: 600;
      background: linear-gradient(145deg, rgba(127,90,240,0.1), rgba(0,183,255,0.08));
      border-radius: inherit; pointer-events: none; text-align: center; padding: 12px;
    }
    .admin-empty-overlay .icon { font-size: 2rem; opacity: 0.6; }

    .admin-bar {
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      z-index: 9999; background: rgba(127,90,240,0.95); color: #fff;
      padding: 8px 16px; border-radius: 999px; font-family: 'Manrope', sans-serif;
      font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 8px 24px rgba(127,90,240,0.5); border: 1px solid rgba(255,255,255,0.3);
      backdrop-filter: blur(10px);
    }
    .admin-bar button {
      background: rgba(255,255,255,0.2); border: none; color: #fff; font: inherit;
      padding: 4px 12px; border-radius: 999px; cursor: pointer;
    }
    .admin-bar button:hover { background: rgba(255,255,255,0.35); }
    .admin-bar a { color: #fff; text-decoration: underline; opacity: 0.9; }

    .admin-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
      z-index: 10000; background: #252b3d; color: #fff; padding: 12px 20px;
      border-radius: 12px; font-family: 'Manrope', sans-serif; font-size: 0.9rem;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5); border: 1px solid rgba(127,90,240,0.4);
      transition: transform .3s ease, opacity .3s ease; opacity: 0; max-width: 480px;
    }
    .admin-toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .admin-toast.error { border-color: rgba(240,90,90,0.6); }
    .admin-toast.success { border-color: rgba(44,182,125,0.6); }
  `;
  const style = document.createElement('style');
  style.id = 'admin-inline-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------- toast ----------
let toastEl = null;
function toast(msg, type = 'info', timeout = 3500) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'admin-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.className = 'admin-toast show ' + type;
  if (toast._t) clearTimeout(toast._t);
  if (timeout) toast._t = setTimeout(() => toastEl.classList.remove('show'), timeout);
}

// ---------- топ-бар ----------
function injectTopBar() {
  if (document.getElementById('admin-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'admin-bar';
  bar.className = 'admin-bar';
  bar.innerHTML = `
    🔧 Режим редактирования
    <button id="admin-logout">Выйти</button>
  `;
  document.body.appendChild(bar);
  bar.querySelector('#admin-logout').addEventListener('click', () => {
    localStorage.removeItem('s3_ak');
    localStorage.removeItem('s3_sk');
    toast('Сессия закрыта. Перезагружаю…', 'success', 1500);
    setTimeout(() => location.reload(), 800);
  });
}

// ---------- aws4fetch (загрузка по требованию) ----------
let _awsClient = null;
async function getClient() {
  if (_awsClient) return _awsClient;
  const { AwsClient } = await import('https://esm.sh/aws4fetch@1.0.20');
  _awsClient = new AwsClient({
    accessKeyId: localStorage.getItem('s3_ak'),
    secretAccessKey: localStorage.getItem('s3_sk'),
    region: REGION,
    service: 's3',
  });
  return _awsClient;
}

// ---------- разметка картинок ----------
function wrapEditable(el) {
  if (el.dataset.adminWrapped === '1') return;
  el.dataset.adminWrapped = '1';

  const key = el.getAttribute('data-editable');
  if (!key) return;

  // Определяем «контейнер»: для img/video/iframe — оборачиваем; если на самом элементе уже
  // есть position-родитель (например .gallery-item, .showcase-image-wrapper), используем его.
  let host;
  if (el.tagName === 'IMG') {
    const parent = el.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    if (parent && (parent.classList.contains('gallery-item') ||
                   parent.classList.contains('showcase-image-wrapper') ||
                   parent.classList.contains('case-card-image') ||
                   parent.classList.contains('card-image') ||
                   parent.classList.contains('about-image'))) {
      host = parent;
      host.classList.add('admin-edit-wrap');
      if (parentStyle && parentStyle.position === 'static') host.style.position = 'relative';
    } else {
      const wrap = document.createElement('span');
      wrap.className = 'admin-edit-wrap';
      if (getComputedStyle(el).display !== 'inline') wrap.classList.add('block');
      el.replaceWith(wrap);
      wrap.appendChild(el);
      host = wrap;
    }
  } else {
    host = el;
    host.classList.add('admin-edit-wrap');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'admin-edit-btn';
  btn.textContent = '✏️';
  btn.title = `Заменить · ${key}`;
  host.appendChild(btn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'admin-delete-btn';
  delBtn.textContent = '🗑';
  delBtn.title = `Удалить · ${key}`;
  host.appendChild(delBtn);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/webp';
  fileInput.style.display = 'none';
  host.appendChild(fileInput);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    await uploadAndApply(el, host, btn, key, file);
    fileInput.value = '';
  });
  delBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Удалить картинку?\n\n${key}\n\nЭто действие нельзя отменить.`)) return;
    await deleteAndApply(el, host, delBtn, key);
  });

  // Если IMG не загрузился — добавим overlay-заглушку
  if (el.tagName === 'IMG') {
    const onErr = () => addEmptyOverlay(host);
    if (el.complete && el.naturalWidth === 0) onErr();
    else el.addEventListener('error', onErr);
  }
}

function addEmptyOverlay(host) {
  if (host.querySelector('.admin-empty-overlay')) return;
  const ov = document.createElement('div');
  ov.className = 'admin-empty-overlay';
  ov.innerHTML = `<span class="icon">📷</span><span>Нажмите ✏️ чтобы загрузить</span>`;
  host.insertBefore(ov, host.firstChild);
}
function removeEmptyOverlay(host) {
  host.querySelector('.admin-empty-overlay')?.remove();
}

// ---------- upload ----------
async function uploadAndApply(el, host, btn, key, file) {
  const aws = await getClient();
  btn.classList.add('uploading');
  btn.textContent = '⏳';

  try {
    const url = `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const resp = await aws.fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'image/png',
        'x-amz-acl': 'public-read',
        'Cache-Control': 'public, max-age=86400',
      },
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} ${txt.slice(0, 120)}`);
    }
    // Кеш-бастер
    const fresh = PUBLIC_URL(key) + '?t=' + Date.now();
    if (el.tagName === 'IMG') {
      el.src = fresh;
      // gallery-item: data-full на родителе
      const gi = el.closest('.gallery-item');
      if (gi && gi.hasAttribute('data-full')) gi.setAttribute('data-full', fresh);
      removeEmptyOverlay(host);
    }
    btn.classList.remove('uploading');
    btn.textContent = '✏️';
    toast(`✓ Загружено: ${key}`, 'success');
  } catch (err) {
    btn.classList.remove('uploading');
    btn.classList.add('error');
    btn.textContent = '!';
    toast(`Ошибка: ${err.message}`, 'error', 6000);
    setTimeout(() => { btn.classList.remove('error'); btn.textContent = '✏️'; }, 4000);
    console.error('[admin-inline] upload failed', err);
  }
}

// ---------- delete ----------
async function deleteAndApply(el, host, btn, key) {
  const aws = await getClient();
  btn.classList.add('uploading');
  btn.textContent = '⏳';
  try {
    const url = `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const resp = await aws.fetch(url, { method: 'DELETE' });
    if (!resp.ok && resp.status !== 404) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} ${txt.slice(0, 120)}`);
    }
    if (el.tagName === 'IMG') {
      // 1×1 прозрачный gif вместо src — чтобы img остался в DOM, но не показывал старое
      el.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
      const gi = el.closest('.gallery-item');
      if (gi && gi.hasAttribute('data-full')) gi.setAttribute('data-full', '');
      addEmptyOverlay(host);
    }
    btn.classList.remove('uploading');
    btn.textContent = '🗑';
    toast(`✓ Удалено: ${key}`, 'success');
  } catch (err) {
    btn.classList.remove('uploading');
    btn.classList.add('error');
    btn.textContent = '!';
    toast(`Ошибка удаления: ${err.message}`, 'error', 6000);
    setTimeout(() => { btn.classList.remove('error'); btn.textContent = '🗑'; }, 4000);
    console.error('[admin-inline] delete failed', err);
  }
}

// ---------- сканер ----------
function scanAndWrap(root = document) {
  root.querySelectorAll('[data-editable]').forEach(wrapEditable);
}

// ---------- public API: после динамического рендера ----------
window.adminInline = { rescan: () => scanAndWrap(), hasKeys };

// ---------- старт ----------
function init() {
  if (!hasKeys()) return;
  injectStyles();
  injectTopBar();
  scanAndWrap();

  // MutationObserver — для динамически добавляемых картинок (projects.html, index.html)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('[data-editable]')) wrapEditable(n);
        n.querySelectorAll?.('[data-editable]').forEach(wrapEditable);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
