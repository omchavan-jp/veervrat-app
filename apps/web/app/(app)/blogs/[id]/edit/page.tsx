'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { blogsApi } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { BlogEditor } from '@/components/blog/blog-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('blogs');
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.blogs.detail(id),
    queryFn: () => blogsApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[720px]">
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title={t('notFound')}
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/blogs/mine" />}
            >
              {t('backToMine')}
            </Button>
          }
        />
      </div>
    );
  }
  return <BlogEditor existing={data} />;
}
