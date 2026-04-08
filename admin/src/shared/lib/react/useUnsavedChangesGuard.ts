import { useEffect } from 'react';
import { unstable_usePrompt as usePrompt, useBeforeUnload } from 'react-router-dom';

export function useUnsavedChangesGuard(when: boolean, message = 'You have unsaved changes. Leave this screen?') {
  usePrompt({ when, message });

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
