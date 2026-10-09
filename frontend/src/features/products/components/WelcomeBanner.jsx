export default function WelcomeBanner() {
  return (
    <section className="relative flex min-h-60 items-center justify-between overflow-hidden rounded-xl border border-[#e1e7d7] bg-[#e9efde] p-6 sm:px-8">
      <div className="relative z-10">
        <span className="rounded bg-[#dce6ce] px-2 py-1 text-[8px] font-semibold tracking-widest text-[#5d7152]">
          A CLEARER VIEW
        </span>
        <h2 className="my-3 text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
          Good things start
          <br />
          with a little order.
        </h2>
        <p className="text-[11px] leading-5 text-[#728068]">
          Your products, details, and prices.
          <br />
          All together. All under control.
        </p>
      </div>
      <div
        aria-hidden="true"
        className="relative hidden h-48 w-72 shrink-0 sm:block"
      >
        <div className="absolute -top-5 left-5 size-60 rounded-full border border-[#d8e1ca] p-6">
          <div className="size-full rounded-full border border-[#d8e1ca]" />
        </div>
        <div className="absolute left-36 top-3 grid size-24 rotate-12 place-items-center border-r-[14px] border-[#57745a] bg-[#668366] text-4xl text-[#d4e0c6] shadow-xl">
          ✳
        </div>
        <div className="absolute left-14 top-16 h-28 w-36 -rotate-9 border-r-[18px] border-t-[14px] border-r-[#b39a74] border-t-[#d7c5a6] bg-[#c5af87] shadow-xl">
          <span className="absolute -top-3 left-12 h-10 w-6 bg-[#e5d5b7]" />
          <span className="absolute left-3 top-10 text-sm font-bold text-[#665a46]">
            stockroom
          </span>
          <span className="absolute bottom-1 left-3 text-xs text-[#77674d]">
            ↑ ↑
          </span>
        </div>
        <div className="absolute bottom-0 right-0 -rotate-4 rounded-lg bg-white px-4 py-3 text-[10px] shadow-sm">
          ✓ A place for everything
        </div>
        <span className="absolute left-0 top-3 text-4xl text-[#8e9e70]">
          ✳
        </span>
      </div>
    </section>
  );
}
