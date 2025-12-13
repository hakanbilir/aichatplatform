import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
// Çeviri dosyalarını içe aktar
import commonTr from './locales/tr/common.json';
import commonEn from './locales/en/common.json';
import authTr from './locales/tr/auth.json';
import authEn from './locales/en/auth.json';
import chatTr from './locales/tr/chat.json';
import chatEn from './locales/en/chat.json';
import orgTr from './locales/tr/org.json';
import orgEn from './locales/en/org.json';
import errorsTr from './locales/tr/errors.json';
import errorsEn from './locales/en/errors.json';
import validationTr from './locales/tr/validation.json';
import validationEn from './locales/en/validation.json';
import promptsTr from './locales/tr/prompts.json';
import promptsEn from './locales/en/prompts.json';
import knowledgeTr from './locales/tr/knowledge.json';
import knowledgeEn from './locales/en/knowledge.json';
import presetsTr from './locales/tr/presets.json';
import presetsEn from './locales/en/presets.json';
import conversationsTr from './locales/tr/conversations.json';
import conversationsEn from './locales/en/conversations.json';
import analyticsTr from './locales/tr/analytics.json';
import analyticsEn from './locales/en/analytics.json';
import brandingTr from './locales/tr/branding.json';
import brandingEn from './locales/en/branding.json';
import retentionTr from './locales/tr/retention.json';
import retentionEn from './locales/en/retention.json';
import webhooksTr from './locales/tr/webhooks.json';
import webhooksEn from './locales/en/webhooks.json';
import auditTr from './locales/tr/audit.json';
import auditEn from './locales/en/audit.json';
import inboxTr from './locales/tr/inbox.json';
import inboxEn from './locales/en/inbox.json';
import publicTr from './locales/tr/public.json';
import publicEn from './locales/en/public.json';
import ragTr from './locales/tr/rag.json';
import ragEn from './locales/en/rag.json';

const resources = {
  tr: {
    common: commonTr,
    auth: authTr,
    chat: chatTr,
    org: orgTr,
    errors: errorsTr,
    validation: validationTr,
    prompts: promptsTr,
    knowledge: knowledgeTr,
    presets: presetsTr,
    conversations: conversationsTr,
    analytics: analyticsTr,
    branding: brandingTr,
    retention: retentionTr,
    webhooks: webhooksTr,
    audit: auditTr,
    inbox: inboxTr,
    public: publicTr,
    rag: ragTr,
  },
  en: {
    common: commonEn,
    auth: authEn,
    chat: chatEn,
    org: orgEn,
    errors: errorsEn,
    validation: validationEn,
    prompts: promptsEn,
    knowledge: knowledgeEn,
    presets: presetsEn,
    conversations: conversationsEn,
    analytics: analyticsEn,
    branding: brandingEn,
    retention: retentionEn,
    webhooks: webhooksEn,
    audit: auditEn,
    inbox: inboxEn,
    public: publicEn,
    rag: ragEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr', // Default language is Turkish / Varsayılan dil Türkçe
    fallbackLng: 'tr', // Fallback language is Turkish / Yedek dil Türkçe
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values / React zaten değerleri kaçış karakteri ile korur
    },
    detection: {
      // Language detection order / Dil algılama sırası
      // Check localStorage first, then use default 'tr' if not found
      // Önce localStorage'ı kontrol et, bulunamazsa varsayılan 'tr' kullan
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // Don't use navigator language as default, use 'tr' instead
      // Varsayılan olarak navigator dilini kullanma, 'tr' kullan
    } as any, // Type assertion for detector options / Algılayıcı seçenekleri için tip onayı
  });

export default i18n;

