type View = 'chat' | 'sessions' | 'tools' | 'skills' | 'stats';

interface NavRailProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const navItems: { id: View; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'sessions', icon: '📁', label: 'Sessions' },
  { id: 'tools', icon: '🔧', label: 'Tools' },
  { id: 'skills', icon: '⚡', label: 'Skills' },
  { id: 'stats', icon: '📊', label: 'Stats' },
];

export function NavRail({ activeView, onViewChange }: NavRailProps) {
  return (
    <nav className="w-14 bg-gray-800 flex flex-col items-center py-2 gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
            activeView === item.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}

export type { View };
