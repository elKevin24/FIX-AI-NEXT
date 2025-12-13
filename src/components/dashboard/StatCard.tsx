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
      <CardBody className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
        <div 
          className="hidden md:flex w-12 h-12 rounded-xl items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: iconBgColor, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.65rem] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 md:mb-1 truncate">{title}</h3>
          <p className="text-xl md:text-3xl font-extrabold text-slate-900 leading-none truncate">{value}</p>
          <p className="text-[0.65rem] md:text-xs text-slate-500 mt-0.5 md:mt-1 truncate">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}
