import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// שם הריפו ב-GitHub. אם משנים את שם הריפו, משנים כאן שורה אחת בלבד.
const REPO_NAME = 'daniel-magic-english-castle'

/**
 * כותב את ה-service worker מתוך התוצאה של הבנייה עצמה.
 *
 * הבעיה שהוא פותר: Vite מוסיף גיבוב לשם כל קובץ, ולכן רשימת קבצים
 * שנכתבת ביד מתיישנת מיד. קובץ שנוסף לדף ולא לרשימה עובד מצוין
 * אונליין ופשוט חסר באוטו - וזה כשלון שלא רואים עד הרגע הכי גרוע.
 *
 * הרשימה כאן נגזרת ממה שבאמת נכתב ל-dist, אחרי שהכל נכתב, ולכן היא
 * לא יכולה לפספס קובץ. שם הקאש הוא גיבוב של הרשימה, כך שכל בנייה
 * שמשנה משהו מקבלת קאש חדש והישן נמחק מעצמו.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist'
  let base = '/'
  return {
    name: 'castle-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    closeBundle() {
      const root = resolve(outDir)
      const files: string[] = []
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name)
          if (statSync(full).isDirectory()) walk(full)
          else files.push(relative(root, full).split('\\').join('/'))
        }
      }
      walk(root)

      const shell = [
        base,
        ...files
          // ה-sw עצמו לא נכנס לקאש שהוא מנהל, ומפות מקור אין כאן בכלל.
          .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
          .sort()
          .map((f) => base + f),
      ]
      const version = createHash('sha256').update(shell.join('\n')).digest('hex').slice(0, 12)

      const template = readFileSync(resolve('src/pwa/sw-template.js'), 'utf8')
      const source = template
        .replaceAll('__SHELL__', JSON.stringify(shell, null, 2))
        .replaceAll('__INDEX__', `${base}index.html`)
        .replaceAll('__VERSION__', version)
      // סמן ששרד הוא service worker שבור, והוא נכשל רק אצל מי שאין לו
      // רשת - כלומר בדיוק במצב שאי אפשר לדווח עליו. עדיף להפיל בנייה.
      const leftover = source.match(/__[A-Z]+__/)
      if (leftover) throw new Error(`sw-template.js still contains ${leftover[0]} after substitution`)
      writeFileSync(join(root, 'sw.js'), source)
      // הדפסה בכוונה: אם המספר הזה קטן פתאום, משהו בבנייה השתנה.
      console.log(`  service worker: ${shell.length} files, version ${version}`)
    },
  }
}

// ב-GitHub Pages האתר יושב תחת /<repo>/, ומקומית תחת /.
// כך גם `npm run dev` וגם `npm run preview` עובדים בלי שינוי ידני.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : '/',
  plugins: [serviceWorker()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})
