import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

// Initialize i18next for Node.js
// Node.js için i18next'i başlat
i18next
  .use(Backend)
  .init({
    lng: 'tr', // Default language is Turkish / Varsayılan dil Türkçe
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en'],
    defaultNS: 'errors',
    ns: ['errors', 'validation'],
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', '{{ns}}.json'),
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;

