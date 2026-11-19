import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { ItemCacheModel } from '@/lib/models/ItemCache'
import { getItemData } from '@/lib/services/itemService'
import { mockFetch, restoreFetch, tokenRoute } from '@/tests/stubs/fetch'

process.env.BNET_CLIENT_ID = 'id'
process.env.BNET_CLIENT_SECRET = 'secret'

// The real Mongoose model is used for its shape only: its two queries are replaced, nothing reaches a database
const written: Array<Record<string, unknown>> = []
const model = ItemCacheModel as unknown as Record<string, unknown>
model.findOne = () => ({ lean: async () => null })
model.findOneAndUpdate = async (_filter: unknown, update: { $set: Record<string, unknown> }) =>
	void written.push(update.$set)

const wowheadXml = '<wowhead><item><droppedBy><n id="1" n="Boss Test"><e n="250"/></n></droppedBy></item></wowhead>'
const wowhead = { match: /wowhead\.com/, reply: { body: wowheadXml } }
const blizzardItem = {
	name: 'Épée de test',
	item_class: { name: 'Arme' },
	inventory_type: { name: 'À une main' },
	preview_item: { stats: [{ type: { type: 'STRENGTH' }, value: 1234 }] },
}
const settled = () => new Promise((r) => setImmediate(r))

beforeEach(() => {
	written.length = 0
})
afterEach(restoreFetch)

test('Blizzard and Wowhead answer: the item is returned and cached', async () => {
	mockFetch([tokenRoute, { match: /\/data\/wow\/item\//, reply: { body: blizzardItem } }, wowhead])
	const item = await getItemData(1)
	assert.equal(item?.name, 'Épée de test')
	assert.equal(item?.sources[0].boss, 'Boss Test')
	await settled()
	assert.equal(written.length, 1)
	assert.equal(written[0].name, 'Épée de test')
})

test('Blizzard fails but Wowhead answers: the sources are returned, nothing is cached', async () => {
	mockFetch([tokenRoute, { match: /\/data\/wow\/item\//, reply: { status: 500 } }, wowhead])
	const item = await getItemData(2)
	assert.equal(item?.name, '')
	assert.equal(item?.sources[0].boss, 'Boss Test')
	await settled()
	assert.equal(written.length, 0)
})

test('Blizzard and Wowhead both fail: null, nothing is cached', async () => {
	mockFetch([
		tokenRoute,
		{ match: /\/data\/wow\/item\//, reply: { status: 500 } },
		{ match: /wowhead\.com/, reply: { status: 500 } },
	])
	assert.equal(await getItemData(3), null)
	await settled()
	assert.equal(written.length, 0)
})
