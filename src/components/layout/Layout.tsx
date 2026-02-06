import { useState, ReactNode } from 'react';
import { TitleBar } from './TitleBar';
import { NavRail, View } from './NavRail';

interface LayoutProps {
  children: (view: View) => ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeView, setActiveView] = useState<View>('sessions');

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <NavRail activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-auto">
          {children(activeView)}
        </main>
      </div>
    </div>
  );
}
