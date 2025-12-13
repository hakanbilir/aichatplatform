import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import i18next from './config';

// Extend FastifyRequest to include i18n
// FastifyRequest'i i18n içerecek şekilde genişlet
declare module 'fastify' {
  interface FastifyRequest {
    i18n: typeof i18next;
  }
}

async function i18nMiddleware(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  // Add i18n to request context
  // İstek bağlamına i18n ekle
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Detect language from Accept-Language header
    // Accept-Language başlığından dili algıla
    const acceptLanguage = request.headers['accept-language'];
    let language = 'tr'; // Default to Turkish / Varsayılan olarak Türkçe

    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "en-US,en;q=0.9,tr;q=0.8")
      // Accept-Language başlığını ayrıştır (örn: "en-US,en;q=0.9,tr;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map((lang) => {
          const parts = lang.trim().split(';');
          const code = parts[0].split('-')[0].toLowerCase(); // Extract base language code / Temel dil kodunu çıkar
          const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
          return { code, quality };
        })
        .sort((a, b) => b.quality - a.quality);

      // Find first supported language
      // İlk desteklenen dili bul
      const supported = languages.find((lang) => ['tr', 'en'].includes(lang.code));
      if (supported) {
        language = supported.code;
      }
    }

    // Change language for this request
    // Bu istek için dili değiştir
    await i18next.changeLanguage(language);
    request.i18n = i18next;
  });
}

export default fp(i18nMiddleware, {
  name: 'i18n-middleware',
});

