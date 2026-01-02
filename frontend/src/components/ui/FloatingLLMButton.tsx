'use client';

import { useState, useEffect } from 'react';
import { Key, Check } from 'lucide-react';
import { APIKeyModal } from './APIKeyModal';
import { useLLMConfigStore } from '@/stores/llmConfigStore';
import { getProvider } from '@/constants/llmProviders';

export function FloatingLLMButton() {
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const llmStore = useLLMConfigStore();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isConfigured = isMounted && llmStore.isConfigured();
  const provider = isMounted ? getProvider(llmStore.provider) : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          fixed bottom-6 right-6 z-40
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg hover:shadow-xl
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          group
          ${isConfigured 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500' 
            : 'gradient-hero-bg hover:opacity-90'
          }
        `}
        title={isConfigured ? `${provider?.name || 'AI'} configured` : 'Configure AI Provider'}
      >
        {isConfigured ? (
          <div className="relative">
            <Key className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
              <Check className="w-2 h-2 text-green-600" />
            </div>
          </div>
        ) : (
          <Key className="w-6 h-6 text-white" />
        )}
        
        {/* Tooltip */}
        <span className="
          absolute right-full mr-3 
          px-3 py-1.5 
          bg-surface text-text text-sm font-medium
          rounded-lg shadow-lg border border-border
          whitespace-nowrap
          opacity-0 group-hover:opacity-100
          translate-x-2 group-hover:translate-x-0
          transition-all duration-200
          pointer-events-none
        ">
          {isConfigured ? `${provider?.name} - ${llmStore.model}` : 'Configure AI'}
        </span>
      </button>

      <APIKeyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => setShowModal(false)}
      />
    </>
  );
}
