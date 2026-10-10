export default function Sidebar({ user, loading, productCount, onAccount, screen }) {
  return (
    <aside className="flex items-center gap-4 border-b border-stone-200 bg-white px-5 py-4 md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col md:items-stretch md:border-r md:px-6 md:py-8">
      <a
        href="/admin"
        className="flex items-center gap-2 text-2xl font-bold tracking-tighter"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-[#214d3c] pb-1 text-3xl text-white">
          s.
        </span>{" "}
        stockroom<sup className="text-[10px]">®</sup>
      </a>
      <div className="mt-7 hidden items-center gap-3 rounded-lg border border-stone-200 p-3 md:flex">
        <span className="rounded-lg bg-stone-100 p-2 text-xs">W</span>
        <div className="text-xs font-medium">
          Admin workspace
          <p className="mt-1 text-[10px] font-normal text-stone-500">
            Product management
          </p>
        </div>
      </div>
      <nav className="hidden md:block">
        <p className="mb-3 mt-4 px-3 text-[9px] tracking-widest text-stone-400">
          WORKSPACE
        </p>
        <a
          href="#products"
          aria-current={screen === "products" ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg p-3 text-xs font-semibold ${screen === "products" ? "bg-[#eef3e9]" : ""}`}
        >
          <span className="text-xl">▦</span> Products{" "}
          <span className="ml-auto rounded bg-[#dfe8d8] px-2 py-1 text-[10px]">
            {productCount}
          </span>
        </a>
        <a href="#orders" aria-current={screen === "orders" ? "page" : undefined}
          className={`mt-2 flex items-center gap-3 rounded-lg p-3 text-xs font-semibold ${screen === "orders" ? "bg-[#eef3e9]" : ""}`}>
          <span aria-hidden="true" className="text-xl">≡</span> Orders
        </a>
        <button
          onClick={onAccount}
          className="mt-2 flex w-full items-center gap-3 p-3 text-xs"
        >
          <span className="text-xl">◎</span> My account
        </button>
      </nav>
      <div className="mt-auto hidden rounded-xl border border-stone-100 bg-[#f8f8f3] p-4 md:block">
        <span className="text-3xl text-[#8a9a61]">✳</span>
        <h3 className="my-2 text-xs font-semibold">A little more organized.</h3>
        <p className="text-[11px] leading-5 text-stone-500">
          A single home for your products. Less admin, more creating.
        </p>
      </div>
      <button
        onClick={onAccount}
        disabled={loading}
        className="ml-auto flex items-center gap-3 text-left md:ml-0 md:border-t md:border-stone-200 md:pt-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ece8de] text-xs">
          {user?.fullName?.trim()[0]?.toUpperCase() || "G"}
        </span>
        <span className="hidden min-w-0 sm:block">
          <strong className="block truncate text-xs font-medium">
            {user?.fullName || "Your workspace"}
          </strong>
          <small className="mt-1 block text-[10px] text-stone-500">
            {user ? `@${user.username}` : "Sign in to get started"}
          </small>
        </span>
      </button>
    </aside>
  );
}
