import { NextResponse } from 'next/server'
import { readSession } from '@/lib/auth'
import { usersDb, charactersDb } from '@/lib/db'
import type { BnetCharacter, EquippedItem, ItemRarity, User } from '@/lib/types'

const SLOT_LABELS: Record<string, string> = {
  head: 'Tête', neck: 'Cou', shoulders: 'Épaules', back: 'Dos',
  chest: 'Torse', wrist: 'Poignets', tabard: 'Tabard', hands: 'Mains',
  belt: 'Ceinture', legs: 'Jambes', boots: 'Bottes',
  ring1: 'Anneau 1', ring2: 'Anneau 2',
  trinket1: 'Breloque 1', trinket2: 'Breloque 2',
  mainhand: 'Main droite', offhand: 'Main gauche',
}

const BNET_SLOT_MAP: Record<string, string> = {
  HEAD: 'head', NECK: 'neck', SHOULDER: 'shoulders', BACK: 'back',
  CHEST: 'chest', WRIST: 'wrist', TABARD: 'tabard', HANDS: 'hands',
  WAIST: 'belt', LEGS: 'legs', FEET: 'boots',
  FINGER_1: 'ring1', FINGER_2: 'ring2',
  TRINKET_1: 'trinket1', TRINKET_2: 'trinket2',
  MAIN_HAND: 'mainhand', OFF_HAND: 'offhand',
}

const LEFT_SLOTS = new Set(['head', 'neck', 'shoulders', 'back', 'chest', 'wrist', 'tabard', 'hands'])

const QUALITY_MAP: Record<string, ItemRarity> = {
  POOR: 'common', COMMON: 'common', UNCOMMON: 'uncommon',
  RARE: 'rare', EPIC: 'epic', LEGENDARY: 'legendary',
}

const EU_BASE = 'https://eu.api.blizzard.com'

async function bnetFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return res.json()
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dashIdx = id.indexOf('-')
  if (dashIdx === -1) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const nameLower = id.slice(0, dashIdx)
  const realmSlug = id.slice(dashIdx + 1)

  const user = await usersDb.findOneAsync<User>({ id: session.userId })
  if (!user?.bnetAccessToken) {
    return NextResponse.json({ error: 'BNet non connecté' }, { status: 400 })
  }
  const token = user.bnetAccessToken

  const existing = await charactersDb.findOneAsync<BnetCharacter>({
    userId: session.userId,
    realmSlug,
    $where: function(this: BnetCharacter) {
      return this.name.toLowerCase() === nameLower
    }
  })

  if (!existing) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })

  const name = existing.name.toLowerCase()
  const locale = 'fr_FR'
  const profileNs = 'namespace=profile-eu'
  const staticNs = 'namespace=static-eu'

  const [summary, media, equipment, currencies] = await Promise.all([
    bnetFetch(`${EU_BASE}/profile/wow/character/${realmSlug}/${name}?${profileNs}&locale=${locale}`, token),
    bnetFetch(`${EU_BASE}/profile/wow/character/${realmSlug}/${name}/character-media?${profileNs}&locale=${locale}`, token),
    bnetFetch(`${EU_BASE}/profile/wow/character/${realmSlug}/${name}/equipment?${profileNs}&locale=${locale}`, token),
    bnetFetch(`${EU_BASE}/profile/wow/character/${realmSlug}/${name}/currencies?${profileNs}&locale=${locale}`, token),
  ])

  // Avatar URL
  const assets: Array<{ key: string; value: string }> = media?.assets ?? []
  const avatarUrl = assets.find((a) => a.key === 'avatar')?.value
  const mainRawUrl = assets.find((a) => a.key === 'main-raw')?.value

  // Summary fields
  const ilvl: number = summary?.equipped_item_level ?? summary?.average_item_level ?? 0
  const spec: string = summary?.active_spec?.name ?? ''
  const specId: number = summary?.active_spec?.id ?? 0
  const title: string = summary?.active_title?.display_string?.replace('{name}', existing.name) ?? ''
  const guildName: string = summary?.guild?.name ?? ''

  // Gold from currencies (currency id 1 = gold, quantity in copper)
  let gold = 0
  if (currencies?.currencies) {
    const goldEntry = currencies.currencies.find((c: { currency: { id: number }; quantity: number }) => c.currency?.id === 1)
    if (goldEntry) gold = Math.floor(goldEntry.quantity / 10000)
  }

  // Equipment slots
  const rawItems: Array<{
    slot: { type: string }
    item: { id: number }
    quality: { type: string }
    name: string
    level: { value: number }
    enchantments?: Array<{ display_string: string; enchantment_slot: { type: string } }>
  }> = equipment?.equipped_items ?? []

  // Fetch item icons in parallel
  const iconRequests = rawItems.map(async (raw) => {
    const itemId = raw.item?.id
    if (!itemId) return { itemId: 0, iconUrl: undefined }
    const mediaData = await bnetFetch(
      `${EU_BASE}/data/wow/media/item/${itemId}?${staticNs}&locale=${locale}`,
      token
    )
    const iconAssets: Array<{ key: string; value: string }> = mediaData?.assets ?? []
    const iconUrl = iconAssets.find((a) => a.key === 'icon')?.value
    return { itemId, iconUrl }
  })
  const iconResults = await Promise.all(iconRequests)
  const iconByItemId = new Map(iconResults.map((r) => [r.itemId, r.iconUrl]))

  const ring1Used = { used: false }
  const trinket1Used = { used: false }

  const allSlots: EquippedItem[] = rawItems
    .map((raw) => {
      const bnetSlotType = raw.slot?.type
      let slotId = BNET_SLOT_MAP[bnetSlotType] ?? ''
      if (!slotId) return null

      // Handle duplicate ring/trinket slots
      if (slotId === 'ring1') {
        if (ring1Used.used) slotId = 'ring2'
        else ring1Used.used = true
      }
      if (slotId === 'trinket1') {
        if (trinket1Used.used) slotId = 'trinket2'
        else trinket1Used.used = true
      }

      const itemId = raw.item?.id ?? 0
      const enchantLine = raw.enchantments?.find(
        (e) => e.enchantment_slot?.type === 'PERMANENT' || e.enchantment_slot?.type === 'TEMPORARY'
      )?.display_string ?? null

      return {
        id: slotId,
        label: SLOT_LABELS[slotId] ?? slotId,
        item: raw.name ?? '',
        ilvl: raw.level?.value ?? 0,
        enchant: enchantLine,
        rarity: QUALITY_MAP[raw.quality?.type] ?? 'common',
        iconUrl: iconByItemId.get(itemId),
      } satisfies EquippedItem
    })
    .filter((s): s is EquippedItem => s !== null)

  const slotsLeft = allSlots.filter((s) => LEFT_SLOTS.has(s.id))
  const slotsRight = allSlots.filter((s) => !LEFT_SLOTS.has(s.id))

  const enriched: Partial<BnetCharacter> = {
    avatarUrl,
    mainRawUrl,
    ilvl,
    spec,
    specId,
    title,
    guildName,
    gold,
    slotsLeft,
    slotsRight,
    enrichedAt: new Date().toISOString(),
  }

  await charactersDb.updateAsync(
    { _id: existing._id },
    { $set: enriched },
    {}
  )

  const updated: BnetCharacter = { ...existing, ...enriched }
  return NextResponse.json({ character: updated })
}
