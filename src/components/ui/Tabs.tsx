import type { ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  renderLabel?: (tab: Tab) => ReactNode;
};

export function Tabs({ tabs, activeTab, onChange, renderLabel }: TabsProps) {
  return (
    <div className="flex gap-0 border-b border-app">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`text-xs px-4 py-2 border-b-2 ${active ? "border-app-brand text-app-primary font-medium" : "border-transparent text-app-muted hover:text-app-secondary"}`}
          >
            {renderLabel ? renderLabel(tab) : tab.label}
          </button>
        );
      })}
    </div>
  );
}
