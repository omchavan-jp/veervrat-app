import { test, expect } from '@playwright/test';
import { MODERATOR } from './helpers/global-setup';
import { makeUser, registerAndOnboard, loginApi, loginUI, apiHeaders } from './helpers/auth';
import { deleteUserByEmail } from './helpers/db';

// Flow 7: blog create → publish → comment → author hides comment → moderator deletes comment.
// Authoring + commenting + hide are driven through the real API (with role/permission
// enforcement), and the published blog is asserted in the public UI. Moderator delete is the
// final state assertion.
const tiptap = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

test.describe('Flow 7: blog create → comment → hide → moderator delete', () => {
  const author = makeUser('f7author');
  const commenter = makeUser('f7commenter');
  let blogId: string;
  let commentId: string;

  test.beforeAll(async () => {
    await registerAndOnboard(author);
    await registerAndOnboard(commenter);
  });

  test.afterAll(() => {
    deleteUserByEmail(author.email);
    deleteUserByEmail(commenter.email);
  });

  test('author creates and publishes a blog', async ({ page }) => {
    const { ctx, csrf } = await loginApi(author);
    const create = await ctx.post('/api/v1/blogs', {
      headers: apiHeaders(csrf),
      data: { title: 'E2E Flow 7 Blog', body: tiptap('A blog body for the moderation flow.') },
    });
    expect(create.ok(), `create blog: ${create.status()}`).toBeTruthy();
    blogId = (await create.json()).data.id;
    // Publish (isDraft=false).
    const pub = await ctx.patch(`/api/v1/blogs/${blogId}`, {
      headers: apiHeaders(csrf),
      data: { isDraft: false },
    });
    expect(pub.ok(), `publish: ${pub.status()}`).toBeTruthy();
    await ctx.dispose();

    // The published blog is visible on its public detail page.
    await page.goto(`/community/blogs/${blogId}`);
    await expect(page.getByText('E2E Flow 7 Blog').first()).toBeVisible({ timeout: 15_000 });
  });

  test('another user comments, author hides it, moderator deletes it', async () => {
    // Commenter adds a comment.
    const c = await loginApi(commenter);
    const addComment = await c.ctx.post(`/api/v1/blogs/${blogId}/comments`, {
      headers: apiHeaders(c.csrf),
      data: { body: 'E2E flow-7 comment' },
    });
    expect(addComment.ok(), `add comment: ${addComment.status()}`).toBeTruthy();
    commentId = (await addComment.json()).data.id;
    await c.ctx.dispose();

    // Author hides the comment (blog-author may hide).
    const a = await loginApi(author);
    const hide = await a.ctx.post(`/api/v1/blogs/${blogId}/comments/${commentId}/hide`, {
      headers: apiHeaders(a.csrf),
    });
    expect(hide.ok(), `hide: ${hide.status()}`).toBeTruthy();
    await a.ctx.dispose();

    // Moderator deletes the comment (moderator may delete any comment).
    const m = await loginApi(MODERATOR);
    const del = await m.ctx.delete(`/api/v1/blogs/${blogId}/comments/${commentId}`, {
      headers: apiHeaders(m.csrf),
    });
    expect(del.ok(), `moderator delete: ${del.status()}`).toBeTruthy();
    await m.ctx.dispose();

    // The comment is gone — fetching the blog no longer returns it.
    const g = await loginApi(author);
    const blog = await g.ctx.get(`/api/v1/blogs/${blogId}`);
    const comments = (await blog.json()).data.comments as { id: string }[];
    expect(comments.find((x) => x.id === commentId)).toBeFalsy();
    await g.ctx.dispose();
  });

  test('moderator can open the moderation dashboard', async ({ page }) => {
    await loginUI(page, MODERATOR);
    await page.goto('/moderation');
    await expect(page).toHaveURL(/\/moderation/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
  });
});
