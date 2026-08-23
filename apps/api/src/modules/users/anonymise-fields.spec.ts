import { describe, it, expect, vi } from 'vitest';
import { UsersRepository } from './users.repository';

/**
 * Asserts WHICH columns anonymisation writes.
 *
 * Deliberately a field-level test rather than a behavioural one: the defect in #140 was not that
 * anonymisation failed, it was that it quietly left identifying columns behind. Only an
 * assertion naming the columns catches that, and catches the next field someone adds to `User`
 * without thinking about deletion.
 */
function capture() {
  const update = vi.fn().mockResolvedValue({ id: 'u1', anonymisedAt: new Date() });
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const repo = new UsersRepository({ user: { update }, authAccount: { updateMany } } as never);
  return { repo, update, updateMany };
}

const at = new Date('2026-08-23T00:00:00Z');
const pseudonym = {
  displayName: '[Deleted user]',
  email: 'anon-x@deleted.invalid',
  username: 'deleted_x',
};

async function dataWritten() {
  const { repo, update } = capture();
  await repo.anonymise('u1', pseudonym, at);
  return (update.mock.calls[0][0] as { data: Record<string, unknown> }).data;
}

describe('anonymise clears every identifying field', () => {
  it('replaces the identifiers the privacy policy names', async () => {
    const data = await dataWritten();

    expect(data.displayName).toBe(pseudonym.displayName);
    expect(data.email).toBe(pseudonym.email);
    expect(data.username).toBe(pseudonym.username);
    expect(data.avatarUrl).toBeNull();
  });

  it('clears the date of birth', async () => {
    // A date of birth narrows identity sharply, and its only purpose — the 18+ check — is spent
    // at account creation. Retaining it beside content kept under a pseudonym is the opposite
    // of anonymising.
    expect((await dataWritten()).dob).toBeNull();
  });

  it('clears gender', async () => {
    expect((await dataWritten()).gender).toBeNull();
  });

  it('clears a pending email address', async () => {
    // The one that made a published sentence false: `pendingEmail` holds a real, deliverable
    // address mid-change, so anyone deleting during an email change kept an email on file while
    // the policy said "we remove your email address".
    expect((await dataWritten()).pendingEmail).toBeNull();
  });

  it('marks the account anonymised, deleted and suspended at one timestamp', async () => {
    const data = await dataWritten();

    expect(data.anonymisedAt).toBe(at);
    expect(data.deletedAt).toBe(at);
    expect(data.suspendedAt).toBe(at);
  });

  it('writes nothing else — content is retained deliberately', async () => {
    // Journeys, logs and messages stay under the pseudonym so a vratmitra's record of their
    // guidance is not left with holes. This pins that the account row is all this touches.
    expect(Object.keys(await dataWritten()).sort()).toEqual([
      'anonymisedAt',
      'avatarUrl',
      'deletedAt',
      'displayName',
      'dob',
      'email',
      'gender',
      'pendingEmail',
      'suspendedAt',
      'username',
    ]);
  });
});

describe('anonymise clears the stored password', () => {
  it('nulls the password hash on every auth account the user holds', async () => {
    // Credential material with no purpose once the account is gone. Scrubbing a date of birth
    // while leaving a password hash behind would be incoherent.
    const { repo, updateMany } = capture();
    await repo.clearStoredPasswords('u1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { passwordHash: null },
    });
  });

  it('keeps the auth_accounts row, and with it the provider link', async () => {
    // Retained deliberately: it is what stops a deleted account being silently recreated and
    // reattached to the same Google identity. Disclosed in the privacy policy rather than
    // removed — deleting the row would lose that protection.
    const { repo, updateMany } = capture();
    await repo.clearStoredPasswords('u1');

    const call = updateMany.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(Object.keys(call.data)).toEqual(['passwordHash']);
  });
});
