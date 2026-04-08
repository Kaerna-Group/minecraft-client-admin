import { useState } from 'react';

import { Button } from './Button';

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
