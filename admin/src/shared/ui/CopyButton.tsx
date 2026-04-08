import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      setFailed(false);
      timeoutRef.current = null;
    }, 1600);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      onClick={async () => {
        try {
          if (!navigator.clipboard?.writeText) {
            throw new Error('Clipboard API is unavailable.');
          }

          await navigator.clipboard.writeText(value);
          setFailed(false);
          setCopied(true);
          scheduleReset();
        } catch {
          setCopied(false);
          setFailed(true);
          scheduleReset();
        }
      }}
    >
      {copied ? 'Copied' : failed ? 'Copy failed' : label}
    </Button>
  );
}
