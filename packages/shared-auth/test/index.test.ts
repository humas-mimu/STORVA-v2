import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signAgentToken, verifyAgentToken, hasScope } from '../src/index'

process.env.SIGNING_PRIVATE_KEY = 'test-signing-secret-1234'

test('signs and verifies a valid token with scopes', async () => {
  const token = await signAgentToken('user-1', 'device-1', ['storage:read'], 300)
  const payload = await verifyAgentToken(token)
  assert.equal(payload.sub, 'user-1')
  assert.equal(payload.deviceId, 'device-1')
  assert.deepEqual(payload.scopes, ['storage:read'])
})

test('hasScope respects full scope names', () => {
  assert.ok(hasScope(['storage:read'], 'storage:read'))
  assert.ok(hasScope(['storage:write'], 'write'))
  assert.ok(!hasScope(['storage:read'], 'storage:write'))
  assert.ok(!hasScope(['storage:read'], 'delete'))
})

test('rejects expired token', async () => {
  const expired = await signAgentToken('u', 'd', ['storage:read'], -10)
  await assert.rejects(() => verifyAgentToken(expired))
})
