'use client';

import { useState } from 'react';
import { Save, Check, X, ChevronDown, ChevronUp, Key } from 'lucide-react';
import { ClearKeyButton } from './ClearKeyButton';

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    description: string;
    placeholder: string;
    key: string;
    active: boolean;
  };
  saveAction: (formData: FormData) => void;
  clearAction: (formData: FormData) => void;
}

export function ProviderSettingsCard({ provider, saveAction, clearAction }: ProviderCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
            <p className="text-sm text-gray-500">{provider.description}</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <form
      action={saveAction}
      className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm relative"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
          <p className="text-sm text-gray-500">{provider.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={provider.active}
              className="w-4 h-4 rounded border-gray-300 bg-white text-cyan-500"
            />
            Active
          </label>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="password"
            name="keyValue"
            defaultValue={provider.key}
            placeholder={provider.placeholder}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
          />
          <input type="hidden" name="provider" value={provider.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 text-base bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          {provider.key && (
            <ClearKeyButton provider={provider.id} clearAction={clearAction} />
          )}
        </div>
        {provider.key && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Key configured
          </div>
        )}
      </div>
    </form>
  );
}
