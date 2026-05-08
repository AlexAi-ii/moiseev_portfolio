"""
Скрипт миграции файлов на S3 после inline-рефакторинга.

Парсит /tmp/refactor_plan.txt (вывод refactor_inline.py до --write) или встроенный
mapping и копирует кириллические файлы в новые латинские пути.

Запуск:
    cd "e:/Claude Code/moiseev_portfolio"
    python admin/migrate_inline_s3.py --plan /tmp/refactor_plan.txt
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

BUCKET = "5a0ee524b59d-s3-storage"
ENDPOINT = "https://s3.ru1.storage.beget.cloud"


def parse_plan(plan_path: Path) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    text = plan_path.read_text(encoding="utf-8")
    # Pattern: "  FROM: ...\n    TO: ..."
    rx = re.compile(r"^  FROM: (.+)\n    TO: (.+)$", re.MULTILINE)
    for m in rx.finditer(text):
        old, new = m.group(1).strip(), m.group(2).strip()
        if old and new:
            pairs.append((old, new))
    return pairs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default="/tmp/refactor_plan.txt", help="path to dry-run plan")
    ap.add_argument("--dry", action="store_true", help="dry-run (no S3 calls)")
    args = ap.parse_args()

    plan_file = Path(args.plan)
    if not plan_file.exists():
        print(f"[!] План не найден: {plan_file}", file=sys.stderr)
        sys.exit(1)

    pairs = parse_plan(plan_file)
    print(f"Найдено {len(pairs)} пар FROM->TO в плане.")

    if args.dry:
        for old, new in pairs:
            print(f"  {old}\n  -> {new}\n")
        return

    try:
        import boto3
    except ImportError:
        print("[!] pip install boto3", file=sys.stderr)
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

    copied = skipped_exists = skipped_missing = errors = 0

    for old, new in pairs:
        # Источник существует?
        try:
            s3.head_object(Bucket=BUCKET, Key=old)
        except Exception as e:
            print(f"  SKIP (no source): {old}  [{e.__class__.__name__}]")
            skipped_missing += 1
            continue
        # Цель уже есть?
        try:
            s3.head_object(Bucket=BUCKET, Key=new)
            print(f"  SKIP (exists):    {new}")
            skipped_exists += 1
            continue
        except Exception:
            pass
        # Копируем
        try:
            s3.copy_object(
                Bucket=BUCKET,
                CopySource={"Bucket": BUCKET, "Key": old},
                Key=new,
                ACL="public-read",
                MetadataDirective="COPY",
            )
            print(f"  COPIED: {old}\n       -> {new}")
            copied += 1
        except Exception as e:
            print(f"  ERROR: {old} -> {new}: {e}")
            errors += 1

    print(f"\nГотово: copied={copied}, exists={skipped_exists}, missing={skipped_missing}, errors={errors}")


if __name__ == "__main__":
    main()
