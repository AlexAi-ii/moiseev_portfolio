"""
Удаление старых кириллических файлов на S3 после миграции в латинскую схему.

Удаляет:
  - Moiseev/Moiseev.JPG  (заменён на Moiseev/profile.jpg)
  - Moiseev/Портфолио/   (вся папка — заменена на Moiseev/portfolio/)

Запуск:
    python admin/cleanup_cyrillic_s3.py            # dry-run, только список
    python admin/cleanup_cyrillic_s3.py --delete   # реальное удаление
"""

from __future__ import annotations

import argparse
import os
import sys

BUCKET = "5a0ee524b59d-s3-storage"
ENDPOINT = "https://s3.ru1.storage.beget.cloud"

PREFIXES_TO_DELETE = ["Moiseev/Портфолио/"]
KEYS_TO_DELETE = ["Moiseev/Moiseev.JPG"]
# Файлы, которые надо ОСТАВИТЬ (не удалять), даже если они в префиксе для удаления.
KEEP_KEYS = {"Moiseev/Портфолио/Нейросотрудник HR.pdf"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--delete", action="store_true", help="actually delete (default: dry-run)")
    args = ap.parse_args()

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

    targets: list[str] = []

    # 1) Префиксы (папки)
    for prefix in PREFIXES_TO_DELETE:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []) or []:
                if obj["Key"] in KEEP_KEYS:
                    print(f"  KEEP: {obj['Key']}")
                    continue
                targets.append(obj["Key"])

    # 2) Отдельные файлы
    for key in KEYS_TO_DELETE:
        try:
            s3.head_object(Bucket=BUCKET, Key=key)
            targets.append(key)
        except Exception:
            pass  # уже нет

    print(f"\n=== К удалению ({len(targets)}) ===")
    for k in targets:
        print(f"  {k}")

    if not args.delete:
        print("\n(dry-run) повтори с --delete, чтобы реально удалить")
        return

    if not targets:
        print("\nНечего удалять.")
        return

    print(f"\nУдаляю {len(targets)} объектов...")
    # S3 delete_objects: до 1000 за раз
    for i in range(0, len(targets), 1000):
        batch = targets[i : i + 1000]
        resp = s3.delete_objects(
            Bucket=BUCKET,
            Delete={"Objects": [{"Key": k} for k in batch], "Quiet": False},
        )
        for d in resp.get("Deleted", []) or []:
            print(f"  DELETED: {d['Key']}")
        for e in resp.get("Errors", []) or []:
            print(f"  ERROR:   {e.get('Key')}: {e.get('Message')}")

    print("\nГотово.")


if __name__ == "__main__":
    main()
