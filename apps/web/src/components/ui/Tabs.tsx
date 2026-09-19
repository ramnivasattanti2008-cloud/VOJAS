'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within Tabs provider');
  return ctx;
}

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, onChange: setValue }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

// Real iOS segmented control: a pill-shaped track holding equal-width
// segments, the active one lifted on a white chip rather than underlined.
export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[10px] bg-[#F2F2F7] p-[3px]',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: selectedValue, onChange } = useTabsContext();
  const isActive = selectedValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => onChange(value)}
      className={cn(
        'flex-1 whitespace-nowrap rounded-[8px] px-4 py-1.5 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-150',
        isActive
          ? 'bg-white text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
          : 'text-[#6E6E73] hover:text-[#1C1C1E]',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  if (selectedValue !== value) return null;
  return (
    <div role="tabpanel" data-state="active" className={cn('pt-2', className)}>
      {children}
    </div>
  );
}
