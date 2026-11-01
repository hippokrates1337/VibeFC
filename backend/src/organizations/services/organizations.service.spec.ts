import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { fakeSupabase, rlsError } from '../../common/testing/fake-supabase';

Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();

const request = { headers: { authorization: 'Bearer t' } } as any;
const orgRow = { id: 'org-1', name: 'Acme', owner_id: 'u1', created_at: '2026-01-01T00:00:00Z' };

describe('OrganizationsService', () => {
  it('creates an organization with a single insert: the database trigger makes the creator admin', async () => {
    const db = fakeSupabase(() => ({ data: orgRow }));
    const service = new OrganizationsService(db.supabaseService);

    const org = await service.create('u1', { name: 'Acme' }, request);

    expect(org).toMatchObject({ id: 'org-1', name: 'Acme', owner_id: 'u1' });
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]).toMatchObject({ table: 'organizations', op: 'insert', payload: { name: 'Acme', owner_id: 'u1' } });
  });

  it('answers 404 for an organization the caller is not a member of', async () => {
    const db = fakeSupabase(() => ({ data: null }));
    const service = new OrganizationsService(db.supabaseService);

    await expect(service.findOne('org-1', 'u1', request)).rejects.toThrow(new NotFoundException('Organization not found'));
  });

  it('answers 403 without the database text when renaming is refused', async () => {
    const db = fakeSupabase(() => ({ error: rlsError }));
    const service = new OrganizationsService(db.supabaseService);

    const error = await service.update('org-1', { name: 'New' }, request).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.message).not.toContain('row-level security');
  });

  it('deletes with an exact count and answers 403 when no row was deleted', async () => {
    let deleted = 1;
    const db = fakeSupabase(() => ({ count: deleted }));
    const service = new OrganizationsService(db.supabaseService);

    await expect(service.remove('org-1', request)).resolves.toBeUndefined();
    expect(db.queries[0].options).toEqual({ count: 'exact' });

    deleted = 0;
    await expect(service.remove('org-1', request)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("reads the caller's role, or null without a membership", async () => {
    let role: string | null = 'editor';
    const db = fakeSupabase(() => ({ data: role ? { role } : null }));
    const service = new OrganizationsService(db.supabaseService);

    await expect(service.getUserRoleInOrganization('u1', 'org-1', request)).resolves.toBe('editor');
    role = null;
    await expect(service.getUserRoleInOrganization('u1', 'org-1', request)).resolves.toBeNull();
  });
});
