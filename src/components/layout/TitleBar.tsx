export function TitleBar() {
  return (
    <div className="h-10 bg-gray-800 flex items-center px-4 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="w-20" /> {/* Space for traffic lights on macOS */}
      <span className="text-sm font-medium text-gray-300">Claude Dashboard</span>
      <div className="flex-1" />
      <button
        className="text-gray-400 hover:text-white px-2 py-1 rounded text-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        Settings
      </button>
    </div>
  );
}
