import { expect,test } from 'bun:test';
import { planIdentities } from '../scripts/plan-transfer.mjs';
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
const user=(id:string,email:string,confirmed: string|null='2026-01-01')=>({id,email,email_confirmed_at:confirmed});
test('identity transfer distinguishes collisions, reviewed matches and new accounts',()=>{
  expect(planIdentities([user(a,'User@example.test')],[user(b,'user@example.test')])[0]).toEqual({source_id:a,destination_id:b,action:'verify_ownership_before_reusing_account'});
  expect(planIdentities([user(a,'user@example.test')],[user(a,'another@example.test')])[0].action).toBe('uuid_collision_manual_review');
  expect(planIdentities([user(a,'user@example.test',null)],[user(b,'user@example.test')])[0].action).toBe('unverified_email_manual_review');
  expect(planIdentities([user(a,'user@example.test')],[])[0].destination_id).toBeNull();
  expect(()=>planIdentities([user(a,'user@example.test'),user(b,'USER@example.test')],[])).toThrow('duplicate');
});
