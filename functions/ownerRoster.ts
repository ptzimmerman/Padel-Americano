/**
 * Initial roster for the organizer account only.
 * Returned by /api/roster after a valid session, then stored in KV.
 * Not imported by the client, so it is not in the public site bundle.
 */
export interface OwnerPlayer {
  id: string;
  name: string;
  nickname?: string;
  isTotogian?: boolean;
  skillLevel?: 'low' | 'medium' | 'high';
  updatedAt: string;
}

export const OWNER_ROSTER_KEY = 'owner-roster';

const SAVED_AT = '2026-11-01T00:00:00.000Z';

/** mkcb5a players. Skill changes from that event: Pete, Janee, Andrew Chapman. */
const SUNDAY_ROSTER: OwnerPlayer[] = [
  { id: '985b00d5-c8ba-457d-8321-96a6c26437f1', name: 'Erik', skillLevel: 'high', isTotogian: false, updatedAt: SAVED_AT },
  { id: '5d996e72-3322-46d1-85b2-d47fc2f1947e', name: 'Abby', skillLevel: 'high', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'b5468455-7420-4364-bbd7-c05d6357dbc1', name: 'Janee', skillLevel: 'high', isTotogian: false, updatedAt: SAVED_AT },
  { id: '8bc16cde-f207-45b4-819b-f7ed709020bc', name: 'Pete', skillLevel: 'high', isTotogian: false, updatedAt: SAVED_AT },
  { id: '7a02d644-609b-4e83-b9c1-c2419a964a78', name: 'Chad', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'b3ac3bbd-7ba2-4cd8-9ff7-48fa509c9f9f', name: 'Sarah', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'a4837968-f1ab-4c8e-b3cf-fffb1c49a165', name: 'Mauro', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: '3800ed7d-a684-48d8-9f1e-2ed3a6aa6964', name: 'Andrew', skillLevel: 'low', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'b0a829d6-a4dd-417e-b1ce-de8b4f07b251', name: 'Dani', skillLevel: 'low', isTotogian: false, updatedAt: SAVED_AT },
  { id: '185d2486-5411-47ff-91b1-22e8a6f5f0ab', name: 'Andrew Chapman', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'c57dde8d-635b-4851-b83b-95e387b01cf6', name: 'Nate', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'fd33f5c8-05e8-437c-b0a7-55c6cdef45af', name: 'Keith', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'fb2e48d6-db75-4b0c-a525-bd63c19c54f6', name: 'Yenny', skillLevel: 'low', isTotogian: false, updatedAt: SAVED_AT },
  { id: '3e4fe9ae-aa5f-4cf1-9d9f-4e8c45abf1a0', name: 'Inna', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: '556a0026-959b-4feb-a82c-7746eb1f11e0', name: 'Mig', skillLevel: 'low', isTotogian: false, updatedAt: SAVED_AT },
  { id: '4432d14a-830a-4145-9cc5-93d711ffe212', name: 'Greg', skillLevel: 'low', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'd43b36bb-e1a6-447b-b2d5-c60267befd5d', name: 'Irgys', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: '902e9bfd-b92c-4c69-af9a-79483572dec6', name: 'Joel', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
  { id: 'c6bf655a-2b89-4fd6-bec1-0d140fb24643', name: 'Renato', skillLevel: 'high', isTotogian: false, updatedAt: SAVED_AT },
  { id: '18eae38b-f985-41c6-a745-8ce87f772ce7', name: 'Natasha', skillLevel: 'medium', isTotogian: false, updatedAt: SAVED_AT },
];

export const initialOwnerRoster = (): OwnerPlayer[] => SUNDAY_ROSTER.map(player => ({ ...player }));

const isSkill = (value: unknown): value is OwnerPlayer['skillLevel'] =>
  value === 'low' || value === 'medium' || value === 'high';

export const parseOwnerPlayers = (value: unknown): OwnerPlayer[] | null => {
  if (!Array.isArray(value) || value.length > 64) return null;
  const players: OwnerPlayer[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length < 1 || record.id.length > 80) return null;
    if (typeof record.name !== 'string' || !record.name.trim() || record.name.trim().length > 80) return null;
    const player: OwnerPlayer = {
      id: record.id,
      name: record.name.trim(),
      isTotogian: !!record.isTotogian,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
    };
    if (typeof record.nickname === 'string' && record.nickname.trim()) {
      player.nickname = record.nickname.trim().slice(0, 80);
    }
    if (isSkill(record.skillLevel)) player.skillLevel = record.skillLevel;
    players.push(player);
  }
  return players;
};
