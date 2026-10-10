import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeskView = "desk" | "collections" | "cleanup" | "rules";
export type RuleKind = "keep" | "archive" | "trash" | "permanent_delete";
export type LetterPlace = "inbox" | "sent" | "archived" | "trash";

export type Collection = {
  id: string;
  name: string;
  note: string;
};

export type CleanupRule = {
  id: string;
  name: string;
  query: string;
  kind: RuleKind;
};

export type Letter = {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  when: string;
  unread: boolean;
  place: LetterPlace;
  pileIds: string[];
};

type Saved = {
  view: DeskView;
  collections: Collection[];
  rules: CleanupRule[];
  letters: Letter[];
};

type DeskState = Saved & {
  setView: (view: DeskView) => void;
  addCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  addRule: (name: string, query: string, kind: RuleKind) => void;
  removeRule: (id: string) => void;
  markRead: (id: string) => void;
  setPlace: (ids: string[], place: LetterPlace) => void;
  deleteForever: (ids: string[]) => void;
  togglePile: (letterId: string, pileId: string) => void;
  writeLetter: (from: string, subject: string, body: string) => void;
  sendLetter: (to: string, subject: string, body: string) => void;
};

export const PRACTICE_LETTERS: Letter[] = [
  {
    id: "practice-buckle",
    from: "Northline Post",
    to: "You",
    subject: "Buckle shipment is at the window",
    body: "The brass buckles for the cream satchels arrived this morning. They are behind the counter under your name.",
    when: "Oct 8",
    unread: true,
    place: "inbox",
    pileIds: [],
  },
  {
    id: "practice-hold",
    from: "Hearth Library",
    to: "You",
    subject: "Your hold is on the desk",
    body: "A book you asked for is waiting at the front desk until Friday. Ask for the green slip.",
    when: "Oct 7",
    unread: true,
    place: "inbox",
    pileIds: [],
  },
  {
    id: "practice-repair",
    from: "Satchel & Stitch",
    to: "You",
    subject: "Repair ticket 184",
    body: "The left strap is restitched and the buckle hole is recut. The ticket is paid. Pick it up when you are next in.",
    when: "Oct 4",
    unread: false,
    place: "inbox",
    pileIds: [],
  },
  {
    id: "practice-fold",
    from: "Weekly Fold",
    to: "You",
    subject: "Three routes, one map",
    body: "This week's fold covers the river road, the ridge cut, and the closed bridge. The bridge stays shut through Sunday.",
    when: "Oct 2",
    unread: true,
    place: "inbox",
    pileIds: [],
  },
  {
    id: "practice-invoice",
    from: "Cobalt Paper Co.",
    to: "You",
    subject: "Invoice for cream stock",
    body: "Forty sheets of cream stock, paid. Keep the invoice with the shop papers.",
    when: "Sep 28",
    unread: false,
    place: "inbox",
    pileIds: [],
  },
  {
    id: "practice-spring",
    from: "Night Window",
    to: "You",
    subject: "Old notes, unread since spring",
    body: "A stack of old notes has been sitting since spring. Say if you want them boxed or thrown out.",
    when: "Sep 12",
    unread: true,
    place: "inbox",
    pileIds: [],
  },
];

function freshId() {
  return crypto.randomUUID();
}

function lettersOf(state: DeskState, ids: string[], place: LetterPlace): Letter[] {
  const wanted = new Set(ids);
  return state.letters.map((letter) => (wanted.has(letter.id) ? { ...letter, place } : letter));
}

export function letterText(letter: Letter) {
  return `${letter.from} ${letter.to} ${letter.subject} ${letter.body}`.toLowerCase();
}

export function ruleMatches(query: string, letters: Letter[]) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return letters.filter((letter) => {
    const hay = letterText(letter);
    return words.every((word) => hay.includes(word));
  });
}

export const useDesk = create<DeskState>()(
  persist(
    (set) => ({
      view: "desk",
      collections: [],
      rules: [],
      letters: PRACTICE_LETTERS,
      setView: (view) => set({ view }),
      addCollection: (name) =>
        set((state) => ({
          collections: [...state.collections, { id: freshId(), name: name.trim(), note: "" }],
        })),
      renameCollection: (collectionId, name) =>
        set((state) => ({
          collections: state.collections.map((item) =>
            item.id === collectionId ? { ...item, name: name.trim() } : item,
          ),
        })),
      removeCollection: (collectionId) =>
        set((state) => ({
          collections: state.collections.filter((item) => item.id !== collectionId),
          letters: state.letters.map((letter) => ({
            ...letter,
            pileIds: letter.pileIds.filter((pileId) => pileId !== collectionId),
          })),
        })),
      addRule: (name, query, kind) =>
        set((state) => ({
          rules: [...state.rules, { id: freshId(), name: name.trim(), query: query.trim(), kind }],
        })),
      removeRule: (ruleId) =>
        set((state) => ({
          rules: state.rules.filter((item) => item.id !== ruleId),
        })),
      markRead: (id) =>
        set((state) => ({
          letters: state.letters.map((letter) =>
            letter.id === id ? { ...letter, unread: false } : letter,
          ),
        })),
      setPlace: (ids, place) => set((state) => ({ letters: lettersOf(state, ids, place) })),
      deleteForever: (ids) =>
        set((state) => {
          const drop = new Set(ids);
          return { letters: state.letters.filter((letter) => !drop.has(letter.id)) };
        }),
      togglePile: (letterId, pileId) =>
        set((state) => ({
          letters: state.letters.map((letter) => {
            if (letter.id !== letterId) return letter;
            const has = letter.pileIds.includes(pileId);
            return {
              ...letter,
              pileIds: has
                ? letter.pileIds.filter((item) => item !== pileId)
                : [...letter.pileIds, pileId],
            };
          }),
        })),
      writeLetter: (from, subject, body) =>
        set((state) => ({
          letters: [
            {
              id: freshId(),
              from: from.trim() || "You",
              to: "You",
              subject: subject.trim(),
              body: body.trim(),
              when: "Oct 10",
              unread: true,
              place: "inbox",
              pileIds: [],
            },
            ...state.letters,
          ],
        })),
      sendLetter: (to, subject, body) =>
        set((state) => {
          const when = "Oct 10";
          const sent = {
            id: freshId(),
            from: "You",
            to: to.trim(),
            subject: subject.trim(),
            body: body.trim(),
            when,
            unread: false,
            place: "sent" as const,
            pileIds: [],
          };
          const delivered = {
            ...sent,
            id: freshId(),
            unread: true,
            place: "inbox" as const,
          };
          return { letters: [delivered, sent, ...state.letters] };
        }),
    }),
    {
      name: "letter-llama-desk",
      skipHydration: true,
      version: 3,
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Partial<Saved>;
        const base = (version ?? 0) < 2 && !saved.letters ? PRACTICE_LETTERS : (saved.letters ?? PRACTICE_LETTERS);
        const fresh = new Map(PRACTICE_LETTERS.map((letter) => [letter.id, letter]));
        const letters = base.map((letter) => {
          const seed = fresh.get(letter.id);
          return {
            ...letter,
            to: letter.to || seed?.to || "You",
            body: seed ? seed.body : letter.body,
          };
        });
        return { ...saved, letters };
      },
    },
  ),
);
