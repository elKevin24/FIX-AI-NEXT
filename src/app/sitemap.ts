import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://fix-ai-next.vercel.app';
  const staticRoutes = ['', '/login', '/tickets/status', '/design-system'];
  const dashboardRoutes = [
    '/dashboard',
    '/dashboard/tickets',
    '/dashboard/customers',
    '/dashboard/parts',
    '/dashboard/invoices',
    '/dashboard/reports',
    '/dashboard/technicians',
    '/dashboard/settings',
    '/dashboard/cash-register',
    '/dashboard/pos',
    '/dashboard/notifications',
    '/dashboard/search',
    '/dashboard/profile/change-password',
    '/dashboard/admin/audit-logs',
  ];

  const routes = [...staticRoutes, ...dashboardRoutes];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : route.startsWith('/dashboard') ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route.startsWith('/dashboard') ? 0.7 : 0.8,
  }));
}