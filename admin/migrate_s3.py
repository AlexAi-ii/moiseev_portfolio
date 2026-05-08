"""
Одноразовая миграция S3 для портфолио:
1. Копирует существующие cover-картинки в новые латинские пути portfolio/<slug>/cover.png
2. Копирует Moiseev.JPG -> profile.jpg
3. Создаёт projects.json и заливает на S3 (public-read)
4. Настраивает CORS на бакете
Старые файлы НЕ удаляются — на случай отката.
"""
import boto3
import json
import urllib.request
from datetime import datetime, timezone
from botocore.config import Config

BUCKET = '5a0ee524b59d-s3-storage'
ENDPOINT = 'https://s3.ru1.storage.beget.cloud'
ACCESS_KEY = 'TRVDEW618IQRCPVWVCFJ'
SECRET_KEY = 'CoBnAD2rG5dvW9RuGXAshfm0DwY45ykxX6wYbxyi'
PUBLIC_BASE = f'{ENDPOINT}/{BUCKET}'

# boto3 1.36+ по умолчанию добавляет checksum-заголовки, которые Beget S3 отвергает
# (XAmzContentSHA256Mismatch). Отключаем через "when_required".
s3 = boto3.client(
    's3',
    endpoint_url=ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name='ru1',
    config=Config(
        request_checksum_calculation='when_required',
        response_checksum_validation='when_required',
        signature_version='s3v4',
    ),
)

# slug -> исходный ключ заставки в S3 (None = заставки нет, будет пустой слот)
COVERS = {
    'billiard':         'Moiseev/Портфолио/Бильярд бот - заставка.png',
    'assistant':        'Moiseev/Портфолио/Личный помощник через ТГ - заставка.png',
    'autopublish':      'Moiseev/Портфолио/Авто‑публикация в Telegram - заставка.png',
    'amp':              'Moiseev/Портфолио/Аудио минус плюс - заставка.png',
    'hr-neuro':         'Moiseev/Портфолио/Нейросотрудник HR - заставка.png',
    'aurpak':           None,
    'lenremont':        'Moiseev/Портфолио/Ассистент помощник (Ленремонт) - 1.png',
    'mchs':             None,
    'zzok-sale':        None,
    'zzok-hr':          'Moiseev/Портфолио/Бот помощник для отдела кадров (ZZok HR) - 1.png',
    'smm-bot':          None,
    'biohacking':       None,
    'salon':            'Moiseev/Портфолио/Салон стрижек и маникюр - заставка.png',
    'payments':         'Moiseev/Портфолио/Отслеживание платежей - заставка.png',
    'holy-scriptures':  None,
}

PROJECTS_META = [
    {
        'slug': 'billiard',
        'name': 'Бронирование столов 24/7 для бильярдного клуба',
        'subtitle': 'Telegram-бот с календарём, оплатой и уведомлениями',
        'link': 'projects/billiard.html',
        'categories': ['leads', 'booking'],
        'metric': 'Снижение нагрузки на 40%',
        'tags': ['Telegram', 'Payments', 'Booking'],
        'segment': 'Малый бизнес',
        'segments': ['smb', 'booking'],
    },
    {
        'slug': 'assistant',
        'name': 'AI-ассистент для задач, почты и календаря',
        'subtitle': 'Личный помощник в Telegram с голосовым управлением',
        'link': 'projects/assistant.html',
        'categories': ['support'],
        'metric': 'Экономия 2+ часов в день',
        'tags': ['Telegram', 'AI', 'Google API'],
        'segment': 'Частное использование',
        'segments': ['support'],
    },
    {
        'slug': 'autopublish',
        'name': 'AI-автопостинг в Telegram из ссылок',
        'subtitle': 'Автоматическая публикация постов из RSS и статей',
        'link': 'projects/autopublish.html',
        'categories': ['content'],
        'metric': 'Экономия 5 часов в неделю',
        'tags': ['Telegram', 'AI', 'RSS'],
        'segment': 'Агентства',
        'segments': ['agencies', 'content'],
    },
    {
        'slug': 'amp',
        'name': 'Платный Telegram-сервис обработки аудио 24/7',
        'subtitle': 'Разделение треков на стемы с автоматической оплатой',
        'link': 'projects/amp.html',
        'categories': ['paid-service'],
        'metric': 'Полная автоматизация продаж',
        'tags': ['Telegram', 'Payments', 'AI'],
        'segment': 'Платный сервис',
        'segments': ['paid-service'],
    },
    {
        'slug': 'hr-neuro',
        'name': 'AI-скрининг откликов и первичная квалификация кандидатов',
        'subtitle': 'Нейросотрудник HR для автоматизации обработки резюме',
        'link': 'projects/hr-neuro.html',
        'categories': ['hr'],
        'metric': '8000+ откликов · 1166 ч экономии',
        'tags': ['AI', 'HR', 'Telegram', 'hh.ru'],
        'segment': 'HR и рекрутинг',
        'segments': ['hr'],
    },
    {
        'slug': 'aurpak',
        'name': 'AI-консультант для входящих B2B-запросов и каталога',
        'subtitle': 'Бот-консультант для производителя пакетов — обработка заявок 24/7',
        'link': 'projects/aurpak.html',
        'categories': ['leads', 'support'],
        'metric': '-60% нагрузки на менеджеров, +25% конверсии',
        'tags': ['AI', 'Telegram', 'B2B', 'Каталог'],
        'segment': 'Агентства',
        'segments': ['agencies', 'leads', 'support'],
    },
    {
        'slug': 'lenremont',
        'name': 'AI-квалификация лидов и калькулятор ремонта',
        'subtitle': 'Умный помощник Ленремонт для расчёта стоимости и записи',
        'link': 'projects/lenremont.html',
        'categories': ['leads', 'booking'],
        'metric': '+35% к записи на замер',
        'tags': ['AI', 'Calculator', 'Booking', 'Telegram'],
        'segment': 'Малый бизнес',
        'segments': ['smb', 'leads', 'booking'],
    },
    {
        'slug': 'mchs',
        'name': 'Ассистент для подготовки коммерческих предложений',
        'subtitle': 'Автоматизация подготовки КП для МЧС',
        'link': 'projects/mchs.html',
        'categories': ['operations'],
        'metric': 'Быстрее КП, меньше ошибок',
        'tags': ['AI', 'Documents', 'B2B'],
        'segment': 'Агентства',
        'segments': ['agencies', 'operations'],
    },
    {
        'slug': 'zzok-sale',
        'name': 'AI-воронка прогрева и передача лидов в CRM',
        'subtitle': 'Бот-продавец ZZOK: прогрев, квалификация, передача в CRM',
        'link': 'projects/zzok-sale.html',
        'categories': ['leads'],
        'metric': '+45% к конверсии в продажу',
        'tags': ['AI', 'Sales', 'CRM', 'Telegram'],
        'segment': 'Агентства',
        'segments': ['agencies', 'leads'],
    },
    {
        'slug': 'zzok-hr',
        'name': 'База знаний и тестирование сотрудников в Telegram',
        'subtitle': 'ZZOK HR: обучение и аттестация через бота',
        'link': 'projects/zzok-hr.html',
        'categories': ['hr'],
        'metric': 'Ускорение адаптации сотрудников',
        'tags': ['AI', 'HR', 'Telegram', 'RAG'],
        'segment': 'Внутренние процессы',
        'segments': ['hr'],
    },
    {
        'slug': 'smm-bot',
        'name': 'AI-контент-календарь и автопланирование для соцсетей',
        'subtitle': 'SMM-бот для beauty-мастеров: планирование и публикация контента',
        'link': 'projects/smm-bot.html',
        'categories': ['content'],
        'metric': 'Экономия 10 часов в неделю',
        'tags': ['AI', 'Content', 'Telegram', 'SMM'],
        'segment': 'Агентства',
        'segments': ['agencies', 'content'],
    },
    {
        'slug': 'biohacking',
        'name': 'Подписной AI-консультант с базой знаний',
        'subtitle': 'Биохакинг: Telegram-бот с подпиской на экспертный контент',
        'link': 'projects/biohacking.html',
        'categories': ['paid-service', 'support'],
        'metric': 'Монетизация экспертизы',
        'tags': ['AI', 'Payments', 'RAG', 'Telegram'],
        'segment': 'Платный сервис',
        'segments': ['paid-service', 'support'],
    },
    {
        'slug': 'salon',
        'name': 'Онлайн-запись и синхронизация с 1С',
        'subtitle': 'Салон красоты: Telegram-бот для записи клиентов с интеграцией 1С',
        'link': 'projects/salon.html',
        'categories': ['leads', 'booking'],
        'metric': 'Сокращение работы админа',
        'tags': ['Booking', '1C', 'Telegram', 'CRM'],
        'segment': 'Малый бизнес',
        'segments': ['smb', 'leads', 'booking'],
    },
    {
        'slug': 'payments',
        'name': 'Автоматизация напоминаний о платежах и дебиторке',
        'subtitle': 'Система автоматических напоминаний через Telegram и WhatsApp',
        'link': 'projects/payments.html',
        'categories': ['operations'],
        'metric': 'Снижение просрочки на 45%',
        'tags': ['Payments', 'Telegram', 'WhatsApp', 'CRM'],
        'segment': 'Малый бизнес',
        'segments': ['smb', 'operations'],
    },
    {
        'slug': 'holy-scriptures',
        'name': 'Мобильное приложение для ежедневной молитвенной практики',
        'subtitle': 'Вырицкий молитвослов — ежедневные напоминания и тексты',
        'link': 'projects/holy-scriptures.html',
        'categories': ['paid-service'],
        'metric': 'Ежедневная практика',
        'tags': ['Mobile', 'Notifications'],
        'segment': 'Платный сервис',
        'segments': ['paid-service'],
    },
]


def main():
    # 1. profile.jpg
    print('[1] Копирую profile.jpg...')
    s3.copy_object(
        Bucket=BUCKET,
        CopySource={'Bucket': BUCKET, 'Key': 'Moiseev/Moiseev.JPG'},
        Key='Moiseev/profile.jpg',
        ACL='public-read',
        MetadataDirective='REPLACE',
        ContentType='image/jpeg',
        CacheControl='public, max-age=86400',
    )
    print('    OK')

    # 2. cover-картинки
    print('[2] Копирую cover-картинки...')
    copied, empty = 0, []
    for slug, src_key in COVERS.items():
        dst_key = f'Moiseev/portfolio/{slug}/cover.png'
        if src_key is None:
            empty.append(slug)
            print(f'    SKIP {slug:18s} (заставки нет — пустой слот)')
            continue
        try:
            s3.copy_object(
                Bucket=BUCKET,
                CopySource={'Bucket': BUCKET, 'Key': src_key},
                Key=dst_key,
                ACL='public-read',
                MetadataDirective='REPLACE',
                ContentType='image/png',
                CacheControl='public, max-age=86400',
            )
            copied += 1
            print(f'    OK   {slug}')
        except Exception as e:
            print(f'    FAIL {slug}: {e}')
    print(f'    Скопировано {copied}, пустых: {len(empty)}')

    # 3. projects.json
    print('[3] Создаю projects.json...')
    for p in PROJECTS_META:
        p['img'] = f'{PUBLIC_BASE}/Moiseev/portfolio/{p["slug"]}/cover.png'
        p['hasImage'] = COVERS[p['slug']] is not None
    manifest = {
        'version': 1,
        'updated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'profile': {'image': f'{PUBLIC_BASE}/Moiseev/profile.jpg'},
        'bucket': BUCKET,
        'endpoint': ENDPOINT,
        'imageBase': f'{PUBLIC_BASE}/Moiseev/portfolio/',
        'projects': PROJECTS_META,
    }
    body = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')
    s3.put_object(
        Bucket=BUCKET,
        Key='Moiseev/projects.json',
        Body=body,
        ACL='public-read',
        ContentType='application/json; charset=utf-8',
        CacheControl='public, max-age=60',
    )
    print(f'    OK projects.json ({len(body)} bytes)')

    # 4. CORS
    print('[4] Настраиваю CORS...')
    cors = {
        'CORSRules': [
            {
                'AllowedMethods': ['GET', 'HEAD'],
                'AllowedOrigins': ['*'],
                'AllowedHeaders': ['*'],
                'MaxAgeSeconds': 3600,
            },
            {
                'AllowedMethods': ['PUT', 'POST', 'DELETE', 'GET', 'HEAD'],
                'AllowedOrigins': [
                    'https://portfolio.aisob.ru',
                    'http://localhost:5500',
                    'http://localhost:8000',
                    'http://127.0.0.1:5500',
                    'http://127.0.0.1:8000',
                ],
                'AllowedHeaders': ['*'],
                'ExposeHeaders': ['ETag'],
                'MaxAgeSeconds': 3600,
            },
        ]
    }
    try:
        s3.put_bucket_cors(Bucket=BUCKET, CORSConfiguration=cors)
        print('    OK')
    except Exception as e:
        print(f'    FAIL: {e}')

    # 5. Проверка публичного доступа
    print('[5] Проверяю публичный URL...')
    try:
        with urllib.request.urlopen(f'{PUBLIC_BASE}/Moiseev/projects.json', timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            print(f'    OK: {len(data["projects"])} проектов в JSON')
    except Exception as e:
        print(f'    FAIL: {e}')

    print('\n=== ГОТОВО ===')
    print(f'projects.json: {PUBLIC_BASE}/Moiseev/projects.json')
    print(f'Пустые слоты: {", ".join(empty) if empty else "нет"}')


if __name__ == '__main__':
    main()
