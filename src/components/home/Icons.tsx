import React from 'react';
import {
  Wrench,
  Package,
  Search,
  Receipt,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Printer,
  ArrowRight,
  LogIn,
  Users,
  Smartphone,
  Laptop,
  Cpu,
  Zap,
  Check
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

export function WrenchIcon({ size = 20, className = '' }: IconProps) {
  return <Wrench size={size} className={className} aria-hidden="true" />;
}

export function PackageIcon({ size = 20, className = '' }: IconProps) {
  return <Package size={size} className={className} aria-hidden="true" />;
}

export function SearchIcon({ size = 20, className = '' }: IconProps) {
  return <Search size={size} className={className} aria-hidden="true" />;
}

export function ReceiptIcon({ size = 20, className = '' }: IconProps) {
  return <Receipt size={size} className={className} aria-hidden="true" />;
}

export function ShieldCheckIcon({ size = 20, className = '' }: IconProps) {
  return <ShieldCheck size={size} className={className} aria-hidden="true" />;
}

export function ClockIcon({ size = 20, className = '' }: IconProps) {
  return <Clock size={size} className={className} aria-hidden="true" />;
}

export function CheckCircleIcon({ size = 20, className = '' }: IconProps) {
  return <CheckCircle2 size={size} className={className} aria-hidden="true" />;
}

export function PrinterIcon({ size = 20, className = '' }: IconProps) {
  return <Printer size={size} className={className} aria-hidden="true" />;
}

export function ArrowRightIcon({ size = 20, className = '' }: IconProps) {
  return <ArrowRight size={size} className={className} aria-hidden="true" />;
}

export function LogInIcon({ size = 20, className = '' }: IconProps) {
  return <LogIn size={size} className={className} aria-hidden="true" />;
}

export function UsersIcon({ size = 20, className = '' }: IconProps) {
  return <Users size={size} className={className} aria-hidden="true" />;
}

export function SmartphoneIcon({ size = 20, className = '' }: IconProps) {
  return <Smartphone size={size} className={className} aria-hidden="true" />;
}

export function LaptopIcon({ size = 20, className = '' }: IconProps) {
  return <Laptop size={size} className={className} aria-hidden="true" />;
}

export function CpuIcon({ size = 20, className = '' }: IconProps) {
  return <Cpu size={size} className={className} aria-hidden="true" />;
}

export function ZapIcon({ size = 20, className = '' }: IconProps) {
  return <Zap size={size} className={className} aria-hidden="true" />;
}

export function CheckIcon({ size = 20, className = '' }: IconProps) {
  return <Check size={size} className={className} aria-hidden="true" />;
}
