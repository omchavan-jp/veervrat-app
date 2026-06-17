'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, ScrollText, BookOpen, Library, FileText, Star, Users, ClipboardList, ChevronRight } from 'lucide-react';
import { useAdminGuard } from '@/hooks/use-admin-guard';

const CARDS = [
  { href: '/admin/users', labelKey: 'usersTitle', descKey: 'usersDesc', icon: Users },
  { href: '/admin/taxonomy', labelKey: 'taxonomyTitle', descKey: 'taxonomyDesc', icon: Sparkles },
  { href: '/admin/shlokas', labelKey: 'shlokasTitle', descKey: 'shlokasDesc', icon: ScrollText },
  { href: '/admin/pothi', labelKey: 'pothiTitle', descKey: 'pothiDesc', icon: BookOpen },
  { href: '/admin/resources', labelKey: 'resourcesTitle', descKey: 'resourcesDesc', icon: Library },
  { href: '/admin/cms', labelKey: 'cmsTitle', descKey: 'cmsDesc', icon: FileText },
  { href: '/admin/featured', labelKey: 'featuredTitle', descKey: 'featuredDesc', icon: Star },
  { href: '/admin/audit', labelKey: 'auditTitle', descKey: 'auditDesc', icon: ClipboardList },
] as const;

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { isAdmin } = useAdminGuard();
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('dashboardTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('dashboardSubtitle')}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CARDS.map(({ href, labelKey, descKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">{t(labelKey)}</div>
              <div className="text-[12px] text-muted">{t(descKey)}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>

      <p className="mt-6 text-[12px] text-muted">{t('auditNote')}</p>
    </div>
  );
}
