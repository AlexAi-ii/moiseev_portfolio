"""
Переименование файлов на S3 и в HTML под новую схему имён.

БЫЛО:
    Moiseev/portfolio/payments/cover.png
    Moiseev/portfolio/payments/screenshot-1.png

СТАЛО:
    Moiseev/portfolio/payments/payments_cover.png
    Moiseev/portfolio/payments/payments_screenshot-1.png

(Структура папок не меняется, только имена файлов получают префикс <slug>_.)

Скрипт:
  1) Находит все объекты под Moiseev/portfolio/<slug>/{cover|screenshot-N}.png
  2) Копирует каждый на новый путь
  3) Удаляет старый
  4) Переписывает все HTML (статические src/data-full/data-editable + JS template-strings)

Запуск:
    python admin/rename_with_slug_prefix.py            # dry-run
    python admin/rename_with_slug_prefix.py --write    # пишет HTML
    python admin/rename_with_slug_prefix.py --s3       # делает rename на S3
    python admin/rename_with_slug_prefix.py --write --s3
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "5a0ee524b59d-s3-storage"
ENDPOINT = "https://s3.ru1.storage.beget.cloud"
PORTFOLIO_PREFIX = "Moiseev/portfolio/"

# Регексп: путь вида .../portfolio/<slug>/cover.png или /screenshot-N.png без префикса.
KEY_RE = re.compile(
    r"^Moiseev/portfolio/(?P<slug>[a-z0-9-]+)/(?P<base>cover|screenshot-\d+)\.png$"
)

# Для HTML: ловим путь /portfolio/<slug>/(cover|screenshot-N).png и заменяем base на <slug>_<base>
HTML_PATH_RE = re.compile(
    r"(/portfolio/(?P<slug>[a-z0-9-]+)/)(?P<base>cover|screenshot-\d+)\.png"
)
# Для JS-шаблонов вида ${p.slug}/cover.png — заменяем на ${p.slug}/${p.slug}_cover.png
JS_TEMPLATE_RE = re.compile(
    r"(/portfolio/\$\{(?P<var>[a-zA-Z0-9_.]+)\}/)(?P<base>cover|screenshot-\d+)\.png"
)


def new_key(old_key: str) -> str | None:
    m = KEY_RE.match(old_key)
    if not m:
        return None
    slug = m.group("slug")
    base = m.group("base")
    new_name = f"{slug}_{base}.png"
    return f"Moiseev/portfolio/{slug}/{new_name}"


def rewrite_html(text: str) -> tuple[str, int]:
    """Returns (new_text, replacement_count)."""
    count = 0

    def repl_path(m: re.Match) -> str:
        nonlocal count
        # Если уже с префиксом — не трогаем
        prefix = m.group(1)
        slug = m.group("slug")
        base = m.group("base")
        # Защита: проверяем, нет ли уже префикса в виде <slug>_ перед base — таких быть не должно,
        # т.к. base ловит только "cover" или "screenshot-N" без подчёркиваний.
        count += 1
        return f"{prefix}{slug}_{base}.png"

    new_text = HTML_PATH_RE.sub(repl_path, text)

    def repl_js(m: re.Match) -> str:
        nonlocal count
        prefix = m.group(1)
        var = m.group("var")
        base = m.group("base")
        count += 1
        return f"{prefix}${{{var}}}_{base}.png"

    new_text = JS_TEMPLATE_RE.sub(repl_js, new_text)
    return new_text, count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write HTML changes")
    ap.add_argument("--s3", action="store_true", help="rename files on S3")
    args = ap.parse_args()

    # ---------- HTML ----------
    html_files = [
        ROOT / "index.html",
        ROOT / "projects.html",
        ROOT / "resume-full.html",
        *sorted((ROOT / "projects").glob("*.html")),
    ]
    plan: list[tuple[Path, str, int]] = []
    for p in html_files:
        old_text = p.read_text(encoding="utf-8")
        new_text, n = rewrite_html(old_text)
        plan.append((p, new_text, n))

    print(f"\n=== HTML (всего {len(plan)} файлов) ===")
    total_html_changes = 0
    for p, _, n in plan:
        if n > 0:
            print(f"  ++ {p.relative_to(ROOT)}: {n} замен")
            total_html_changes += n
        else:
            print(f"  -- {p.relative_to(ROOT)}: без изменений")
    print(f"Итого замен в HTML: {total_html_changes}")

    if args.write:
        for p, new_text, n in plan:
            if n > 0:
                p.write_text(new_text, encoding="utf-8")
                print(f"  WROTE: {p.relative_to(ROOT)}")

    # ---------- S3 ----------
    if args.s3:
        try:
            import boto3
        except ImportError:
            print("[!] pip install boto3", file=sys.stderr)
            sys.exit(1)

        access_key = os.environ.get("S3_ACCESS_KEY") or input("Access Key: ").strip()
        secret_key = os.environ.get("S3_SECRET_KEY") or input("Secret Key: ").strip()
        s3 = boto3.client(
            "s3",
            endpoint_url=ENDPOINT,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="ru1",
        )

        # Найти все объекты в portfolio/, попадающие под старый шаблон
        to_rename: list[tuple[str, str]] = []
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=BUCKET, Prefix=PORTFOLIO_PREFIX):
            for obj in page.get("Contents", []) or []:
                old = obj["Key"]
                nk = new_key(old)
                if nk and nk != old:
                    to_rename.append((old, nk))

        print(f"\n=== S3 переименований ({len(to_rename)}) ===")
        for old, new in to_rename:
            print(f"  {old}")
            print(f"  -> {new}")
            print()

        renamed = errors = 0
        for old, new in to_rename:
            try:
                # Если цель уже есть — пропускаем
                try:
                    s3.head_object(Bucket=BUCKET, Key=new)
                    print(f"  SKIP exists: {new}")
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
                s3.delete_object(Bucket=BUCKET, Key=old)
                print(f"  RENAMED: {old} -> {new}")
                renamed += 1
            except Exception as e:
                print(f"  ERROR: {old} -> {new}: {e}")
                errors += 1

        print(f"\nГотово: renamed={renamed}, errors={errors}")

    if not args.write and not args.s3:
        print("\n(dry-run) повтори с --write и/или --s3")


if __name__ == "__main__":
    main()
