## 2024-05-23 - [React.memo in Streaming Chat Interfaces]
**Learning:** In chat applications where AI responses are streamed, the parent component re-renders on every token update. If child components (like message bubbles) are not memoized, they all re-render dozens of times per second, even if their content hasn't changed.
**Action:** Always wrap list items in `React.memo` when the parent list is subject to high-frequency updates (like streaming text or real-time data feeds), provided the data props for the items are stable.
