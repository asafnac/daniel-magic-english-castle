# שרת הסנכרון

שרת קטן שמאפשר לדניאל לשחק ב-iPad, בטלפון ובמחשב ולהמשיך תמיד מאותו מקום.

בלי השרת המשחק עובד במלואו — ההתקדמות פשוט נשמרת על כל מכשיר בנפרד.

---

## מה זה כולל, ומה לא

| כן | לא |
|---|---|
| מסמך התקדמות אחד לכל קוד משפחה | חשבונות, אימייל, סיסמאות |
| ספריית Node הסטנדרטית בלבד | תלויות npm, מסד נתונים |
| מיזוג שלא מאבד נתונים | דריסה של מכשיר אחד בשני |
| קובץ JSON לכל משפחה | ענן, שירות חיצוני, מעקב |

**מה השרת יודע:** מחרוזת אקראית, ומסמך התקדמות.
**מה הוא לא יודע:** מי משחקת, בת כמה היא, איך קוראים לה ואיפה היא גרה.

---

## התקנה

צריך Node 18 ומעלה.

```bash
git clone https://github.com/asafnac/daniel-magic-english-castle.git
cd daniel-magic-english-castle
npm install
npm run build:server
```

הרצה ראשונה לבדיקה:

```bash
node server/dist/server/server.js
```

```bash
curl http://127.0.0.1:8787/health
```

אמור לחזור `{"ok":true}`.

### משתני סביבה

| משתנה | ברירת מחדל | למה |
|---|---|---|
| `PORT` | `8787` | יציאה |
| `HOST` | `127.0.0.1` | כתובת האזנה. להשאיר כך, ולשים proxy מלפנים |
| `DATA_DIR` | `./data` | איפה נשמרים הקבצים |
| `ALLOW_ORIGIN` | `*` | כדאי לצמצם לכתובת של המשחק |

---

## הרצה קבועה עם systemd

```ini
# /etc/systemd/system/castle-sync.service
[Unit]
Description=Daniel's Magic English Castle sync
After=network.target

[Service]
Type=simple
User=castle
WorkingDirectory=/opt/castle
ExecStart=/usr/bin/node /opt/castle/server/dist/server/server.js
Environment=PORT=8787
Environment=HOST=127.0.0.1
Environment=DATA_DIR=/var/lib/castle
Environment=ALLOW_ORIGIN=https://asafnac.github.io
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/castle

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system --home /opt/castle castle
sudo mkdir -p /var/lib/castle && sudo chown castle /var/lib/castle
sudo systemctl enable --now castle-sync
sudo systemctl status castle-sync
```

---

## אם כבר יש לכם אתר עם HTTPS על אותו שרת

זה המקרה הפשוט ביותר, והוא **לא דורש דומיין חדש, לא רשומת DNS חדשה ולא תעודה חדשה**. מוסיפים נתיב לאתר שכבר עובד, והסנכרון יושב תחתיו.

נניח שהאתר הקיים הוא `www.example.co.il`. מוסיפים לתוך בלוק ה-`server` הקיים שלו:

**nginx**

```nginx
location /castle-sync/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

הלוכסן בסוף `proxy_pass` הוא לא קישוט: הוא מה שמסיר את `/castle-sync` מהנתיב לפני שהוא מגיע לשרת. בלעדיו השרת יקבל `/castle-sync/health` ולא ידע מה זה.

**Apache** (צריך `a2enmod proxy proxy_http`)

```apache
ProxyPass        /castle-sync/ http://127.0.0.1:8787/
ProxyPassReverse /castle-sync/ http://127.0.0.1:8787/
```

**Caddy**

```caddyfile
handle_path /castle-sync/* {
    reverse_proxy 127.0.0.1:8787
}
```

`handle_path` מסיר את הקידומת מעצמו, בשונה מ-`handle`.

ואז ב-systemd מגבילים את המקור לכתובת המשחק:

```ini
Environment=ALLOW_ORIGIN=https://asafnac.github.io
```

**במסך ההורים מקלידים ככתובת השרת:** `https://www.example.co.il/castle-sync`

לוכסן מיותר בסוף לא מזיק, המשחק מנקה אותו.

השילוב הזה נבדק מקצה לקצה מול proxy שמסיר קידומת בדיוק כמו nginx: `/health`, יצירת שמירה, דחיפה משני מכשירים עם מיזוג, תשובת preflight של הדפדפן, וכותרת CORS נכונה.

### תת-דומיין, אם מעדיפים הפרדה

`castle.example.co.il` עם רשומת DNS משלו עובד באותה מידה, וההגדרה שלו נמצאת בסעיף הבא. ההבדל היחיד הוא שצריך רשומת DNS ותעודה, ובתמורה הסנכרון לא חולק שם מארח עם האתר הקיים.

---

## HTTPS — חובה, לא המלצה

המשחק מתארח ב-GitHub Pages תחת HTTPS. דפדפן **חוסם** פנייה מדף מאובטח לכתובת לא מאובטחת, ולכן שרת ב-HTTP פשוט לא יעבוד. וזה טוב: קוד המשפחה הוא הסוד היחיד שמגן על הנתונים, ואסור שיעבור גלוי ברשת.

הכי קל עם Caddy, שמסדר תעודה לבד:

```caddyfile
castle.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

או nginx עם certbot:

```nginx
server {
    server_name castle.example.com;
    listen 443 ssl;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

`X-Forwarded-For` חשוב: בלעדיו הגבלת הקצב רואה את כל העולם ככתובת אחת.

---

## חיבור המשחק

1. פותחים את המשחק ← **מסך הורים** ← לשונית **סנכרון**.
2. בשדה הכתובת: `https://castle.example.com`.
3. לוחצים **לייצר קוד חדש**, ושומרים את הקוד. הוא נראה כך: `KMTPX-BDFGH-JQRST-VWXZ2`.
4. **לשמור ולסנכרן**.
5. בכל מכשיר נוסף: אותה כתובת, **אותו קוד**, ושוב לשמור ולסנכרן.

הקוד הוא הסיסמה. מי שיש לו אותו רואה את ההתקדמות, ולכן לא שולחים אותו בקבוצת וואטסאפ.

---

## מה קורה כששני מכשירים משחקים במקביל

לא הולך כלום לאיבוד, וזו לא הבטחה כללית אלא תוצאה של המבנה.

כמעט כל הנתונים מונוטוניים: מונים שרק עולים ודגלים שרק נדלקים. כוכבים לא יורדים, אזור שנפתח לא נסגר, ומילה שנלמדה לא נשכחת. לכן המיזוג הוא מקסימום לכל מונה ואיחוד לכל אוסף — בלי לאבד ובלי לספור פעמיים.

הדברים היחידים שאינם מונוטוניים הם המראה, ההגדרות והאזור האחרון, ושם העדכני מנצח.

המיזוג קורה **גם בשרת וגם בלקוח**, מאותו קוד בדיוק ([src/learning/merge.ts](../src/learning/merge.ts)). המיזוג בשרת אינו מיותר: בלעדיו שתי דחיפות בהפרש של שנייה היו גורמות לשנייה לדרוס את הראשונה.

---

## גיבוי

```bash
tar czf castle-backup-$(date +%F).tar.gz -C /var/lib/castle .
```

שמות הקבצים הם גיבוב של הקוד ולא הקוד עצמו, כך שהסוד לא יושב בשם קובץ ולא מגיע ללוגים של הגיבוי.

---

## פתרון תקלות

**"לא הצלחתי להתחבר לשרת".** לבדוק `systemctl status castle-sync`, ואז `curl https://castle.example.com/health` מבחוץ.

**עובד במחשב ולא ב-iPad.** כמעט תמיד HTTPS: תעודה לא תקינה, או שהכתובת שהוקלדה היא `http://`.

**404 על `/health` כשמתארחים תחת נתיב.** כמעט תמיד הלוכסן בסוף `proxy_pass` חסר, ולכן הקידומת לא מוסרת והשרת מקבל נתיב שהוא לא מכיר. ב-Caddy זה `handle` במקום `handle_path`.

**המשחק נטען אבל לא מסנכרן.** אם `ALLOW_ORIGIN` מוגדר, הוא חייב להתאים בדיוק לכתובת שממנה נטען המשחק, כולל הפרוטוקול ובלי לוכסן בסוף.

**429.** הגבלת קצב. אם יש proxy מלפנים, צריך להעביר `X-Forwarded-For`.

בכל אחד מהמקרים האלה **המשחק ממשיך לעבוד**. ההתקדמות נשמרת מקומית, והסנכרון הבא יעלה אותה.
