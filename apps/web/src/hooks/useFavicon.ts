// apps/web/src/hooks/useFavicon.ts

import { useEffect } from 'react';

export function useFavicon(url: string | null | undefined) {
  useEffect(() => {
    if (!url) return;

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = url;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = url;
      document.head.appendChild(newLink);
    }
  }, [url]);
}
