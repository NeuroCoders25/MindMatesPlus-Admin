import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Shared shape for chart records consumed by all chart types.
// `name` is commonly used for X-axis/pie labels and `value` for plotting.
type ChartDataPoint = {
  name?: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
};

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  type: 'area' | 'bar' | 'pie';
  data: ReadonlyArray<ChartDataPoint>;
  height?: number;
}

export default function ChartWidget({ title, subtitle, type, data, height = 300 }: ChartWidgetProps) {
  // Recharts expects a mutable array type; cloning keeps prop input immutable for callers.
  const chartData = [...data];

  return (
    // Reusable analytics card shell used across admin pages.
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      
      <div style={{ width: '100%', height }}>
        {/* Guard state for screens where data has not loaded yet. */}
        {chartData.length === 0 ? (
          <div className="h-full grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            No chart data available.
          </div>
        ) : (
        <ResponsiveContainer>
          {type === 'area' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0'
                }}
              />
              <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
