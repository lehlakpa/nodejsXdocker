import Sidebar from "./Sidebar.jsx";
export default function WorkspaceLayout({
  user,
  loading,
  productCount,
  onAccount,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f8f9f6] font-sans text-[#293d34] antialiased [&_button]:cursor-pointer [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-green-700">
      <Sidebar
        user={user}
        loading={loading}
        productCount={productCount}
        onAccount={onAccount}
      />
      <main className="md:ml-60">
        <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-5 text-xs md:px-10">
          <span className="text-stone-500">
            Workspace <span className="mx-3 text-stone-300">/</span>{" "}
            <span className="text-[#293d34]">Products</span>
          </span>
          <span className="hidden text-[10px] text-stone-500 sm:block">
            ● Everything in one place
          </span>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-7 lg:px-10">
          {children}
          <footer className="mt-6 flex justify-between gap-3 text-[9px] text-stone-400">
            <span>Made for a more organized everyday.</span>
            <span>STOCKROOM © {new Date().getFullYear()}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
