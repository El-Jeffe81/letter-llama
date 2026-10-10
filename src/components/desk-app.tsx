import { useEffect, useState } from "react";
import {
  FolderClosed,
  ListChecks,
  Plus,
  ShieldAlert,
  Stamp,
  Trash2,
} from "lucide-react";
import {
  ruleMatches,
  useDesk,
  type DeskView,
  type Letter,
  type LetterPlace,
  type RuleKind,
} from "@/lib/desk-store";

const views: { id: DeskView; label: string; icon: typeof Stamp }[] = [
  { id: "desk", label: "Desk", icon: Stamp },
  { id: "collections", label: "Piles", icon: FolderClosed },
  { id: "cleanup", label: "Cleanup", icon: Trash2 },
  { id: "rules", label: "Rules", icon: ListChecks },
];

const kindLabel: Record<RuleKind, string> = {
  keep: "Keep",
  archive: "Archive",
  trash: "Trash",
  permanent_delete: "Permanent delete",
};

const placeLabel: Record<LetterPlace, string> = {
  inbox: "Inbox",
  sent: "Sent",
  archived: "Set aside",
  trash: "Trash",
};

export function DeskApp() {
  const view = useDesk((state) => state.view);
  const setView = useDesk((state) => state.setView);

  useEffect(() => {
    void useDesk.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-ink text-paper md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line md:flex md:flex-col md:px-4 md:py-6">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Desk">
          {views.map((item) => (
            <NavButton key={item.id} item={item} current={view} onPick={setView} />
          ))}
        </nav>
        <p className="mt-auto pt-8 text-sm leading-normal text-paper/60">
          Mail on this device. Send, file, and delete from here.
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:hidden">
          <img
            src="/letter-llama.jpg"
            alt=""
            width={768}
            height={768}
            className="size-11 rounded-xl ring-1 ring-brass/70"
          />
          <div>
            <p className="font-display text-xl leading-none">Letter Llama</p>
            <p className="mt-1 text-sm text-brass">On this device</p>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-10">
          <View view={view} />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-line bg-ink/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
        aria-label="Desk"
      >
        {views.map((item) => (
          <NavButton key={item.id} item={item} current={view} onPick={setView} compact />
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <img
        src="/letter-llama.jpg"
        alt=""
        width={768}
        height={768}
        className="size-14 rounded-2xl ring-1 ring-brass/70"
      />
      <div>
        <p className="font-display text-2xl leading-none">Letter Llama</p>
        <p className="mt-1 text-sm text-brass">On this device</p>
      </div>
    </div>
  );
}

function NavButton({
  item,
  current,
  onPick,
  compact = false,
}: {
  item: (typeof views)[number];
  current: DeskView;
  onPick: (view: DeskView) => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const selected = current === item.id;
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={() => onPick(item.id)}
      className={
        compact
          ? `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${selected ? "text-cobalt" : "text-paper/60"}`
          : `flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-base ${selected ? "bg-surface text-paper" : "text-paper/70"}`
      }
    >
      <Icon aria-hidden="true" className="size-5" />
      {item.label}
    </button>
  );
}

function View({ view }: { view: DeskView }) {
  if (view === "collections") return <Collections />;
  if (view === "cleanup") return <Cleanup />;
  if (view === "rules") return <Rules />;
  return <DeskHome />;
}

function DeskHome() {
  const letters = useDesk((state) => state.letters);
  const markRead = useDesk((state) => state.markRead);
  const sendLetter = useDesk((state) => state.sendLetter);
  const [place, setPlace] = useState<LetterPlace>("inbox");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const visible = letters.filter((letter) => letter.place === place);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? visible.filter((letter) => `${letter.from} ${letter.to} ${letter.subject} ${letter.body}`.toLowerCase().includes(needle))
    : visible;
  const open = letters.find((letter) => letter.id === openId) ?? null;

  if (open) {
    return (
      <Reader
        letter={open}
        onBack={() => setOpenId(null)}
        onSent={() => {
          setOpenId(null);
          setPlace("sent");
        }}
      />
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{placeLabel[place]}</h1>
      <p className="mt-3 max-w-xl text-base leading-normal text-paper/70">
        This mailbox lives in the app. Write a letter and send it. It shows up in Sent and in the inbox.
      </p>
      {writing ? (
        <form
          className="mt-5 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!to.trim() || !subject.trim() || !body.trim()) return;
            sendLetter(to, subject, body);
            setTo("");
            setSubject("");
            setBody("");
            setWriting(false);
            setPlace("sent");
          }}
        >
          <label className="text-sm text-paper/60" htmlFor="letter-to">
            To
          </label>
          <input
            id="letter-to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="Name"
            className="min-h-12 rounded-xl border border-line bg-ink px-3 outline-none placeholder:text-paper/40"
          />
          <label className="text-sm text-paper/60" htmlFor="letter-subject">
            Subject
          </label>
          <input
            id="letter-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="min-h-12 rounded-xl border border-line bg-ink px-3 outline-none"
          />
          <label className="text-sm text-paper/60" htmlFor="letter-body">
            Letter
          </label>
          <textarea
            id="letter-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            className="rounded-xl border border-line bg-ink px-3 py-3 outline-none"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="min-h-12 rounded-xl bg-cobalt px-4 text-paper">
              Send
            </button>
            <button
              type="button"
              onClick={() => setWriting(false)}
              className="min-h-12 rounded-xl border border-line px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-cobalt px-4 text-paper"
        >
          <Plus aria-hidden="true" className="size-5" />
          New letter
        </button>
      )}
      <label className="sr-only" htmlFor="letter-search">
        Search mail
      </label>
      <input
        id="letter-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search mail"
        className="mt-5 min-h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none placeholder:text-paper/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(placeLabel) as LetterPlace[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPlace(key)}
            className={`min-h-11 rounded-full px-4 text-sm ${place === key ? "bg-cobalt text-paper" : "border border-line text-paper/70"}`}
          >
            {placeLabel[key]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 text-paper/60">Nothing in {placeLabel[place].toLowerCase()}.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {shown.map((letter) => (
            <li key={letter.id}>
              <button
                type="button"
                onClick={() => {
                  markRead(letter.id);
                  setOpenId(letter.id);
                }}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-left"
              >
                <span className="flex items-center justify-between gap-3 text-sm text-paper/60">
                  <span>{letter.place === "sent" ? `To ${letter.to}` : letter.from}</span>
                  <span>{letter.when}</span>
                </span>
                <span className="mt-1 flex items-start gap-2">
                  {letter.unread ? (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-cobalt" aria-label="Unread" />
                  ) : null}
                  <span className="font-display text-2xl leading-tight">{letter.subject}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reader({
  letter,
  onBack,
  onSent,
}: {
  letter: Letter;
  onBack: () => void;
  onSent: () => void;
}) {
  const collections = useDesk((state) => state.collections);
  const setPlace = useDesk((state) => state.setPlace);
  const deleteForever = useDesk((state) => state.deleteForever);
  const togglePile = useDesk((state) => state.togglePile);
  const sendLetter = useDesk((state) => state.sendLetter);
  const [armed, setArmed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const piles = collections.filter((item) => letter.pileIds.includes(item.id));

  return (
    <article className="mx-auto max-w-3xl">
      <button type="button" onClick={onBack} className="min-h-11 text-sm text-cobalt">
        Back to mail
      </button>
      <p className="mt-4 text-sm text-paper/60">
        From {letter.from} · To {letter.to || "You"} · {letter.when} · {placeLabel[letter.place]}
      </p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-balance">{letter.subject}</h1>
      <p className="mt-4 max-w-xl text-lg leading-normal text-pretty text-paper/80">{letter.body}</p>
      {replying ? (
        <form
          className="mt-6 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!reply.trim()) return;
            const subject = letter.subject.startsWith("Re:") ? letter.subject : `Re: ${letter.subject}`;
            sendLetter(letter.from, subject, reply.trim());
            setReply("");
            setReplying(false);
            onSent();
          }}
        >
          <label className="text-sm text-paper/60" htmlFor="reply-body">
            Reply to {letter.from}
          </label>
          <textarea
            id="reply-body"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            className="rounded-xl border border-line bg-ink px-3 py-3 outline-none"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="min-h-12 rounded-xl bg-cobalt px-4 text-paper">
              Send reply
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              className="min-h-12 rounded-xl border border-line px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="mt-6 min-h-12 rounded-xl bg-cobalt px-4 text-paper"
        >
          Reply
        </button>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {letter.place === "trash" ? (
          <button
            type="button"
            onClick={() => setPlace([letter.id], "inbox")}
            className="min-h-12 rounded-xl bg-cobalt px-4 text-paper"
          >
            Put back in the satchel
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPlace([letter.id], letter.place === "archived" ? "inbox" : "archived")}
              className="min-h-12 rounded-xl border border-line px-4"
            >
              {letter.place === "archived" ? "Return to satchel" : "Set aside"}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setPlace([letter.id], "trash");
              }}
              className="min-h-12 rounded-xl border border-cobalt/50 px-4 text-cobalt"
            >
              Move to trash
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-paper/60">
        Trash can be undone. Delete forever cannot.
      </p>
      {armed ? (
        <div className="mt-4 rounded-2xl border border-brass/60 px-4 py-4">
          <p className="text-sm leading-normal text-brass">
            This removes the letter from this mailbox. It cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => {
              deleteForever([letter.id]);
              onBack();
            }}
            className="mt-3 min-h-12 w-full rounded-xl bg-brass px-4 text-ink"
          >
            Yes, delete this letter
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-4 min-h-12 rounded-xl border border-brass/60 px-4 text-brass"
        >
          Delete forever
        </button>
      )}
      <div className="mt-6">
        <label className="text-sm text-paper/60" htmlFor="add-pile">
          Piles
        </label>
        {collections.length === 0 ? (
          <p className="mt-2 text-sm text-paper/60">Make a pile first. A pile does not create a label.</p>
        ) : (
          <select
            id="add-pile"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              togglePile(letter.id, event.target.value);
              event.target.value = "";
            }}
            className="mt-2 min-h-12 w-full rounded-xl border border-line bg-ink px-3"
          >
            <option value="">Add or remove a pile</option>
            {collections.map((item) => (
              <option key={item.id} value={item.id}>
                {letter.pileIds.includes(item.id) ? `Remove from ${item.name}` : item.name}
              </option>
            ))}
          </select>
        )}
        {piles.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {piles.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => togglePile(letter.id, item.id)}
                  className="min-h-11 rounded-full border border-brass/60 px-4 text-sm text-brass"
                >
                  {item.name} · remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function Collections() {
  const collections = useDesk((state) => state.collections);
  const letters = useDesk((state) => state.letters);
  const addCollection = useDesk((state) => state.addCollection);
  const renameCollection = useDesk((state) => state.renameCollection);
  const removeCollection = useDesk((state) => state.removeCollection);
  const [name, setName] = useState("");

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Piles</h1>
      <p className="mt-3 max-w-xl text-base leading-normal text-paper/70">
        A pile is a list you keep in Letter Llama. Removing a pile does not delete the letters.
      </p>
      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          addCollection(name);
          setName("");
        }}
      >
        <label className="sr-only" htmlFor="pile-name">
          Pile name
        </label>
        <input
          id="pile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Receipts, keep, later"
          className="min-h-12 flex-1 rounded-xl border border-line bg-ink px-3 text-paper outline-none placeholder:text-paper/40"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cobalt px-4 text-paper"
        >
          <Plus aria-hidden="true" className="size-5" />
          Add pile
        </button>
      </form>
      {collections.length === 0 ? (
        <p className="mt-8 text-paper/60">No piles yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {collections.map((item) => {
            const members = letters.filter((letter) => letter.pileIds.includes(item.id));
            return (
              <li key={item.id} className="rounded-2xl border border-line bg-surface px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor={`pile-${item.id}`}>
                    Rename {item.name}
                  </label>
                  <input
                    id={`pile-${item.id}`}
                    defaultValue={item.name}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next && next !== item.name) renameCollection(item.id, next);
                      else event.target.value = item.name;
                    }}
                    className="min-h-11 flex-1 rounded-lg bg-transparent px-2 text-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeCollection(item.id)}
                    className="min-h-11 rounded-lg px-3 text-left text-sm text-paper/70"
                  >
                    Remove pile
                  </button>
                </div>
                {members.length === 0 ? (
                  <p className="px-2 pb-2 text-sm text-paper/50">No letters in this pile.</p>
                ) : (
                  <ul className="px-2 pb-2">
                    {members.map((letter) => (
                      <li key={letter.id} className="text-sm leading-normal text-paper/70">
                        {letter.subject}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Cleanup() {
  const letters = useDesk((state) => state.letters);
  const setPlace = useDesk((state) => state.setPlace);
  const deleteForever = useDesk((state) => state.deleteForever);
  const [bin, setBin] = useState<"active" | "trash">("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [armed, setArmed] = useState(false);
  const pool = letters.filter((letter) => (bin === "trash" ? letter.place === "trash" : letter.place !== "trash"));

  function toggle(id: string) {
    setArmed(false);
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Cleanup</h1>
      <p className="mt-3 max-w-xl text-base leading-normal text-paper/70">
        Choose letters. Trash can be undone. Delete forever asks a second time and does not trash them instead.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setBin("active");
            setSelected([]);
            setArmed(false);
          }}
          className={`min-h-11 rounded-full px-4 text-sm ${bin === "active" ? "bg-cobalt text-paper" : "border border-line text-paper/70"}`}
        >
          Still here
        </button>
        <button
          type="button"
          onClick={() => {
            setBin("trash");
            setSelected([]);
            setArmed(false);
          }}
          className={`min-h-11 rounded-full px-4 text-sm ${bin === "trash" ? "bg-cobalt text-paper" : "border border-line text-paper/70"}`}
        >
          Trash
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {pool.map((letter) => {
          const on = selected.includes(letter.id);
          return (
            <li key={letter.id}>
              <label className="flex min-h-14 items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(letter.id)}
                  className="mt-1 size-5 accent-cobalt"
                />
                <span>
                  <span className="block text-sm text-paper/60">{letter.from}</span>
                  <span className="block text-lg">{letter.subject}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {pool.length === 0 ? <p className="mt-4 text-paper/60">Nothing in this tray.</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {bin === "trash" ? (
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              setPlace(selected, "inbox");
              setSelected([]);
              setArmed(false);
            }}
            className="min-h-12 rounded-xl border border-cobalt/50 px-4 text-cobalt disabled:text-paper/40"
          >
            Put back
          </button>
        ) : (
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              setPlace(selected, "trash");
              setSelected([]);
              setArmed(false);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cobalt/50 px-4 text-cobalt disabled:text-paper/40"
          >
            <Trash2 aria-hidden="true" className="size-5" />
            Move to trash
          </button>
        )}
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => setArmed(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brass/60 px-4 text-brass disabled:text-paper/40"
        >
          <ShieldAlert aria-hidden="true" className="size-5" />
          Delete forever
        </button>
      </div>
      {armed ? (
        <div className="mt-4 rounded-2xl border border-brass/60 px-4 py-4">
          <p className="text-sm leading-normal text-brass">
            This removes the selected letters from this mailbox. It cannot be undone, and it does not move them to trash.
          </p>
          <button
            type="button"
            onClick={() => {
              deleteForever(selected);
              setSelected([]);
              setArmed(false);
            }}
            className="mt-3 min-h-12 w-full rounded-xl bg-brass px-4 text-ink"
          >
            Yes, delete these letters
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Rules() {
  const rules = useDesk((state) => state.rules);
  const letters = useDesk((state) => state.letters);
  const addRule = useDesk((state) => state.addRule);
  const removeRule = useDesk((state) => state.removeRule);
  const setPlace = useDesk((state) => state.setPlace);
  const deleteForever = useDesk((state) => state.deleteForever);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RuleKind>("archive");
  const [armedId, setArmedId] = useState<string | null>(null);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Rules</h1>
      <p className="mt-3 max-w-xl text-base leading-normal text-paper/70">
        A rule sorts letters in this mailbox. Delete forever still asks twice and will not trash them instead.
      </p>
      <form
        className="mt-6 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          addRule(name, query, kind);
          setName("");
          setQuery("");
          setKind("archive");
        }}
      >
        <label className="text-sm text-paper/60" htmlFor="rule-name">
          Name
        </label>
        <input
          id="rule-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-12 rounded-xl border border-line bg-ink px-3 outline-none"
        />
        <label className="text-sm text-paper/60" htmlFor="rule-query">
          Words to match
        </label>
        <input
          id="rule-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="invoice, newsletter, spring"
          className="min-h-12 rounded-xl border border-line bg-ink px-3 outline-none placeholder:text-paper/40"
        />
        <label className="text-sm text-paper/60" htmlFor="rule-kind">
          Action
        </label>
        <select
          id="rule-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as RuleKind)}
          className="min-h-12 rounded-xl border border-line bg-ink px-3"
        >
          {(Object.keys(kindLabel) as RuleKind[]).map((key) => (
            <option key={key} value={key}>
              {kindLabel[key]}
            </option>
          ))}
        </select>
        {kind === "permanent_delete" ? (
          <p className="text-sm leading-normal text-brass">
            Running this asks a second time. It deletes the matches. It does not trash them.
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cobalt px-4 text-paper"
        >
          <Plus aria-hidden="true" className="size-5" />
          Save rule
        </button>
      </form>
      <ul className="mt-6 flex flex-col gap-2">
        {rules.map((rule) => {
          const hits = ruleMatches(rule.query, letters);
          return (
            <li key={rule.id} className="rounded-2xl border border-line bg-surface px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg">{rule.name}</p>
                  <p className="mt-1 text-sm text-paper/60">
                    {kindLabel[rule.kind]}
                    {rule.query ? ` · ${rule.query}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-paper/70">
                    {hits.length === 0
                      ? "No letters match."
                      : `${hits.length} match: ${hits.map((letter) => letter.subject).join(", ")}`}
                  </p>
                  {rule.kind === "permanent_delete" ? (
                    armedId === rule.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteForever(hits.map((letter) => letter.id));
                          setArmedId(null);
                        }}
                        className="mt-3 min-h-12 rounded-xl bg-brass px-4 text-ink"
                      >
                        Yes, delete these letters
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={hits.length === 0}
                        onClick={() => setArmedId(rule.id)}
                        className="mt-3 min-h-12 rounded-xl border border-brass/60 px-4 text-brass disabled:text-paper/40"
                      >
                        Delete matches forever
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={hits.length === 0}
                      onClick={() => {
                        const ids = hits.map((letter) => letter.id);
                        if (rule.kind === "trash") setPlace(ids, "trash");
                        else if (rule.kind === "archive") setPlace(ids, "archived");
                        else setPlace(ids, "inbox");
                        setArmedId(null);
                      }}
                      className="mt-3 min-h-12 rounded-xl border border-cobalt/50 px-4 text-cobalt disabled:text-paper/40"
                    >
                      {rule.kind === "trash"
                        ? "Move matches to trash"
                        : rule.kind === "archive"
                          ? "Set matches aside"
                          : "Keep matches in the satchel"}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="min-h-11 shrink-0 text-sm text-paper/70"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
