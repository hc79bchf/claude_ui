interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
