'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';

interface ClearKeyButtonProps {
  provider: string;
  clearAction: (formData: FormData) => void;
}

export function ClearKeyButton({ provider, clearAction }: ClearKeyButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClear = () => {
    const formData = new FormData();
    formData.append('provider', provider);
    formData.append('keyValue', '');
    formData.append('isActive', 'off');
    startTransition(() => {
      clearAction(formData);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClear}
      disabled={isPending}
      className="flex items-center gap-1.5 px-4 py-2 text-base bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      title="Clear this API key"
    >
      <Trash2 className="w-4 h-4" />
      {isPending ? 'Clearing...' : 'Clear'}
    </button>
  );
}
