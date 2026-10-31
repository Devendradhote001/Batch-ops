import { useEffect } from 'react';

/** Sets the browser tab title to "<title> · BatchOps" while the page is mounted. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · BatchOps`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
