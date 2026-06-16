'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { blogsApi } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { BlogEditor } from '@/components/blog/blog-editor';

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.blogs.detail(id),
    queryFn: () => blogsApi.getOne(id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }
  if (isError || !data) return <div className="mx-auto max-w-[720px] text-muted">Not found.</div>;
  return <BlogEditor existing={data} />;
}
