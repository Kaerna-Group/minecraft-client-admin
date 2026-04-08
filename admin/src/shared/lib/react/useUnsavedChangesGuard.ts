import { useEffect } from 'react';
import { useBeforeUnload } from 'react-router-dom';

export function useUnsavedChangesGuard(when: boolean, message = 'You have unsaved changes. Leave this screen?') {
  useBeforeUnload(
    (event) => {
      if (!when) {
        return;
      }

      event.preventDefault();
      event.returnValue = message;
    },
    { capture: true },
  );

  useEffect(() => {
    if (!when) {
      return;
    }

    const previousValue = document.title;
    document.title = `${previousValue.replace(/^\*\s*/, '')} *`;

    return () => {
      document.title = previousValue;
    };
  }, [when]);
}
