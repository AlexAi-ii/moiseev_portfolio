"""
Одноразовый скрипт миграции под inline-режим админки.

Делает 2 вещи:

1) Переписывает HTML страниц проектов (projects/*.html):
   - Показ-картинка (showcase)         → Moiseev/portfolio/<slug>/cover.png
   - Галерея, 1-я картинка             → Moiseev/portfolio/<slug>/screenshot-1.png
   - Галерея, 2-я картинка             → Moiseev/portfolio/<slug>/screenshot-2.png
   - Галерея, 3-я картинка             → Moiseev/portfolio/<slug>/screenshot-3.png
   - Добавляет data-editable атрибут на каждую <img>
   - Подключает <script type="module" src="../assets/admin-inline.js" defer>

2) Копирует на S3 старые кириллические файлы → новые латинские пути.

Файл-шаблон billiard.html уже обновлён руками — пропускаем.

Запуск:
    cd "e:/Claude Code/moiseev_portfolio"
    python admin/refactor_inline.py            # dry-run, показывает план без изменений
    python admin/refactor_inline.py --write    # реально пишет HTML
    python admin/refactor_inline.py --s3       # копирует файлы на S3 (требует boto3 + ключи)
    python admin/refactor_inline.py --write --s3
"""

from __future__ import annotations

import os
import re
import sys
import json
import argparse
from pathlib import Path
from urllib.parse import unquote
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
PROJECTS_DIR = ROOT / "projects"
ADMIN_INLINE_TAG = '<script type="module" src="../assets/admin-inline.js" defer></script>'
ADMIN_INLINE_TAG_ROOT = '<script type="module" src="assets/admin-inline.js" defer></script>'

S3_BASE = "https://s3.ru1.storage.beget.cloud/5a0ee524b59d-s3-storage/"
BUCKET = "5a0ee524b59d-s3-storage"
ENDPOINT = "https://s3.ru1.storage.beget.cloud"

S3_URL_RE = re.compile(
    r"https://s3\.ru1\.storage\.beget\.cloud/5a0ee524b59d-s3-storage/[^\s\"'<>]+"
)
SHOWCASE_IMG_RE = re.compile(
    r'(<div class="showcase-image-wrapper">\s*<img\s+src=")([^"]+)("[^>]*?>)',
    re.DOTALL,
)
GALLERY_ITEM_RE = re.compile(
    r'(<div class="gallery-item"\s+data-full=")([^"]+)("\s+data-caption="[^"]*">\s*<img\s+src=")([^"]+)("[^>]*?>)',
    re.DOTALL,
)


def s3_key_from_url(url: str) -> str:
    """Decode S3 URL → key inside bucket."""
    if S3_BASE not in url:
        return ""
    raw = url.split(S3_BASE, 1)[1]
    return unquote(raw)


def english_url(key: str) -> str:
    """Build clean S3 URL without URL-encoding for ASCII path."""
    return f"{S3_BASE}{key}"


def add_data_editable(img_tag: str, key: str) -> str:
    """Add data-editable attribute to an <img> tag if not already present."""
    if "data-editable=" in img_tag:
        return img_tag
    return img_tag.replace("<img ", f'<img data-editable="{key}" ', 1)


def add_admin_inline_script(html: str, root_level: bool = False) -> str:
    """Insert admin-inline script tag before the i18n.js block (or before </body>)."""
    tag = ADMIN_INLINE_TAG_ROOT if root_level else ADMIN_INLINE_TAG
    if tag in html or "admin-inline.js" in html:
        return html
    # Try to put it right after i18n.js for consistency
    pattern = re.compile(r'(<script src="(?:\.\./)?i18n\.js"></script>)')
    if pattern.search(html):
        return pattern.sub(rf"\1\n  {tag}", html, count=1)
    return html.replace("</body>", f"  {tag}\n</body>", 1)


def process_project_html(path: Path):
    """
    Return (new_html, mapping) where mapping is set of (OLD_KEY, NEW_KEY) tuples.
    """
    slug = path.stem
    src = path.read_text(encoding="utf-8")
    mapping: set = set()  # set of (old_key, new_key) tuples

    # ---- showcase ----
    def repl_showcase(m: re.Match) -> str:
        old_url = m.group(2)
        old_key = s3_key_from_url(old_url)
        new_key = f"Moiseev/portfolio/{slug}/cover.png"
        if old_key and old_key != new_key:
            mapping.add((old_key, new_key))
        new_url = english_url(new_key)
        new_img = m.group(3)
        if "data-editable=" not in new_img:
            new_img = new_img.rstrip(">") + f' data-editable="{new_key}">'
        return f"{m.group(1)}{new_url}{new_img}"

    new_html = SHOWCASE_IMG_RE.sub(repl_showcase, src, count=1)

    # ---- gallery items: enumerate matches ----
    gallery_idx = [0]

    def repl_gallery(m: re.Match) -> str:
        i = gallery_idx[0]
        gallery_idx[0] += 1
        slot = i + 1  # 1-based
        new_key = f"Moiseev/portfolio/{slug}/screenshot-{slot}.png"

        old_full = s3_key_from_url(m.group(2))
        old_img = s3_key_from_url(m.group(4))
        if old_full and old_full != new_key:
            mapping.add((old_full, new_key))
        if old_img and old_img != new_key:
            mapping.add((old_img, new_key))

        new_url = english_url(new_key)
        new_img_tag = m.group(5)
        if "data-editable=" not in new_img_tag:
            new_img_tag = new_img_tag.rstrip(">") + f' data-editable="{new_key}">'
        return f"{m.group(1)}{new_url}{m.group(3)}{new_url}{new_img_tag}"

    new_html = GALLERY_ITEM_RE.sub(repl_gallery, new_html)

    # ---- inject admin-inline.js ----
    new_html = add_admin_inline_script(new_html, root_level=False)

    return new_html, mapping


def process_resume_html(path: Path):
    """resume-full.html: only profile photo."""
    src = path.read_text(encoding="utf-8")
    mapping: set = set()  # set of (old_key, new_key) tuples
    new_key = "Moiseev/profile.jpg"

    def repl(m: re.Match) -> str:
        url = m.group(2)
        old_key = s3_key_from_url(url)
        if old_key and old_key != new_key:
            mapping.add((old_key, new_key))
        new_img = m.group(3)
        if "data-editable=" not in new_img:
            new_img = new_img.rstrip(">") + f' data-editable="{new_key}">'
        return f"{m.group(1)}{english_url(new_key)}{new_img}"

    pat = re.compile(
        r'(<img\s+class="resume-photo"\s+src=")([^"]+)("[^>]*?>)',
        re.DOTALL,
    )
    new_html = pat.sub(repl, src, count=1)
    new_html = add_admin_inline_script(new_html, root_level=True)
    return new_html, mapping


def process_index_html(path: Path):
    """
    index.html: about photo + 6 featured cases inside JS array.
    """
    src = path.read_text(encoding="utf-8")
    mapping: set = set()  # set of (old_key, new_key) tuples

    # 1) about photo
    new_key_profile = "Moiseev/profile.jpg"

    def repl_about(m: re.Match) -> str:
        old_key = s3_key_from_url(m.group(2))
        if old_key and old_key != new_key_profile:
            mapping.add((old_key, new_key_profile))
        new_img = m.group(3)
        if "data-editable=" not in new_img:
            new_img = new_img.rstrip(">") + f' data-editable="{new_key_profile}">'
        return f"{m.group(1)}{english_url(new_key_profile)}{new_img}"

    new_html = re.sub(
        r'(<img\s+class="about-photo"\s+src=")([^"]+)("[^>]*?>)',
        repl_about,
        src,
        count=1,
        flags=re.DOTALL,
    )

    # 2) featuredCases array — каждый кейс имеет .link типа "projects/<slug>.html"
    # Заменяем img: '...' → img: '<S3_BASE>Moiseev/portfolio/<slug>/cover.png'
    fc_pat = re.compile(
        r"(\{\s*name:[^}]*?img:\s*')([^']+)('[^}]*?link:\s*'projects/([a-z0-9-]+)\.html'[^}]*?\})",
        re.DOTALL,
    )

    def repl_fc(m: re.Match) -> str:
        old_url = m.group(2)
        slug = m.group(4)
        old_key = s3_key_from_url(old_url)
        new_key = f"Moiseev/portfolio/{slug}/cover.png"
        if old_key and old_key != new_key:
            mapping.add((old_key, new_key))
        return f"{m.group(1)}{english_url(new_key)}{m.group(3)}"

    new_html = fc_pat.sub(repl_fc, new_html)

    # 3) data-editable надо ставить на динамически созданный <img>. Нужно править renderCases:
    # `<div class="case-card-image"><img src="${c.img}" alt="${name}" loading="lazy"></div>`
    new_html = new_html.replace(
        '<div class="case-card-image"><img src="${c.img}" alt="${name}" loading="lazy"></div>',
        '<div class="case-card-image"><img src="${c.img}" alt="${name}" loading="lazy" data-editable="Moiseev/portfolio/${c.slug}/cover.png"></div>',
    )
    # featuredCases теперь должен иметь slug — добавим в каждый объект, если нет.
    # Простой путь: после link: 'projects/<slug>.html' добавляем slug: '<slug>'
    def add_slug_field(m: re.Match) -> str:
        full = m.group(0)
        slug = m.group(1)
        if "slug:" in full:
            return full
        return full.replace(f"link: 'projects/{slug}.html'", f"link: 'projects/{slug}.html', slug: '{slug}'")

    new_html = re.sub(
        r"\{\s*name:[^}]*?link:\s*'projects/([a-z0-9-]+)\.html'[^}]*?\}",
        add_slug_field,
        new_html,
        flags=re.DOTALL,
    )

    new_html = add_admin_inline_script(new_html, root_level=True)
    return new_html, mapping


def process_projects_html(path: Path):
    """projects.html: уже использует новую схему. Только подключить скрипт + добавить
    data-editable в JS-рендер карточек."""
    src = path.read_text(encoding="utf-8")
    mapping: set = set()  # set of (old_key, new_key) tuples

    # Замена строки рендера: добавить data-editable в <img>
    src = src.replace(
        '`<div class="card-image"><img src="${p.img}" alt="${name}" loading="lazy"\n                onerror="this.parentElement.classList.add(\'empty\');this.parentElement.innerHTML=\'Фото скоро появится\';"></div>`',
        '`<div class="card-image"><img src="${p.img}" alt="${name}" loading="lazy" data-editable="Moiseev/portfolio/${p.slug}/cover.png"\n                onerror="this.parentElement.classList.add(\'empty\');this.parentElement.innerHTML=\'Фото скоро появится\';"></div>`',
    )
    # Также пустой плейсхолдер должен иметь возможность загрузить — заменим
    src = src.replace(
        '`<div class="card-image empty">Фото скоро появится</div>`',
        '`<div class="card-image empty" data-editable="Moiseev/portfolio/${p.slug}/cover.png">Фото скоро появится</div>`',
    )
    src = add_admin_inline_script(src, root_level=True)
    return src, mapping


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write changes to disk")
    parser.add_argument("--s3", action="store_true", help="copy old → new keys on S3")
    args = parser.parse_args()

    all_mappings: set = set()
    plan: List[Tuple[Path, str]] = []

    # 14 project pages (skip billiard - already done by hand)
    for html_path in sorted(PROJECTS_DIR.glob("*.html")):
        if html_path.stem == "billiard":
            continue
        new_html, mp = process_project_html(html_path)
        plan.append((html_path, new_html))
        all_mappings |= mp

    # resume-full.html
    resume = ROOT / "resume-full.html"
    new_html, mp = process_resume_html(resume)
    plan.append((resume, new_html))
    all_mappings.update(mp)

    # index.html
    index = ROOT / "index.html"
    new_html, mp = process_index_html(index)
    plan.append((index, new_html))
    all_mappings.update(mp)

    # projects.html
    projects_idx = ROOT / "projects.html"
    new_html, mp = process_projects_html(projects_idx)
    plan.append((projects_idx, new_html))
    all_mappings.update(mp)

    print(f"\n=== Pages to update ({len(plan)}) ===")
    for path, new in plan:
        old = path.read_text(encoding="utf-8")
        if old == new:
            print(f"  -- {path.relative_to(ROOT)} (no changes)")
        else:
            diff_count = sum(1 for a, b in zip(old.splitlines(), new.splitlines()) if a != b) + abs(len(old.splitlines()) - len(new.splitlines()))
            print(f"  ++ {path.relative_to(ROOT)}  (~{diff_count} строк изменено)")

    print(f"\n=== S3 файлы для копирования ({len(all_mappings)}) ===")
    for old, new in sorted(all_mappings):
        print(f"  FROM: {old}")
        print(f"    TO: {new}")
        print()

    if args.write:
        for path, new in plan:
            path.write_text(new, encoding="utf-8")
            print(f"  WROTE: {path.relative_to(ROOT)}")

    if args.s3:
        try:
            import boto3
        except ImportError:
            print("\n[!] boto3 не установлен. pip install boto3", file=sys.stderr)
            sys.exit(1)

        access_key = os.environ.get("S3_ACCESS_KEY") or input("Access Key: ").strip()
        secret_key = os.environ.get("S3_SECRET_KEY") or input("Secret Key: ").strip()
        if not access_key or not secret_key:
            print("[!] Нет ключей", file=sys.stderr)
            sys.exit(1)
        s3 = boto3.client(
            "s3",
            endpoint_url=ENDPOINT,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="ru1",
        )
        for old, new in sorted(all_mappings):
            try:
                # Проверка существования источника
                s3.head_object(Bucket=BUCKET, Key=old)
            except Exception as e:
                print(f"  SKIP: {old} (not on S3: {e.__class__.__name__})")
                continue
            try:
                # Проверка существования цели — не перезаписываем
                s3.head_object(Bucket=BUCKET, Key=new)
                print(f"  EXISTS: {new}")
                continue
            except Exception:
                pass
            s3.copy_object(
                Bucket=BUCKET,
                CopySource={"Bucket": BUCKET, "Key": old},
                Key=new,
                ACL="public-read",
                MetadataDirective="COPY",
            )
            print(f"  COPIED: {old} -> {new}")

    if not args.write and not args.s3:
        print("\n(dry-run) повтори с --write, чтобы записать HTML; --s3 чтобы скопировать файлы на S3")


if __name__ == "__main__":
    main()
