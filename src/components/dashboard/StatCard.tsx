import React from 'react';
import { Card, CardBody } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: number | string;
  label: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({ title, value, label, icon, iconBgColor = '#dbeafe', iconColor = '#1e40af' }: StatCardProps) {
  return (
    <Card className="hover:translate-y-[-2px] transition-transform duration-300">
      <CardBody className="flex items-center gap-4 p-5">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: iconBgColor, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
          <p className="text-3xl font-extrabold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}
