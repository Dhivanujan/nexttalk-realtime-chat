export default function Sidebar({
  user,
  conversations,
  activeId,
  searchValue,
  onSearch,
  onSelect,
}) {
  return (
    <aside className="flex h-full w-full flex-col bg-white/70 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">NextTalk</p>
            <p className="text-xs text-ink-500">{user?.name || "Guest"}</p>
          </div>
        </div>
        <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-ink-700">
          Settings
        </button>
      </div>
      <div className="px-5 py-3">
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearch?.(event.target.value)}
          placeholder="Search chats"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-ink-700 focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations?.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect?.(conversation)}
            className={`flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-brand-50 ${
              activeId === conversation.id ? "bg-brand-50" : "bg-transparent"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-ink-200" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">{conversation.title}</p>
              <p className="text-xs text-ink-500 line-clamp-1">{conversation.preview}</p>
            </div>
            <span className="text-xs text-ink-400">{conversation.time}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
