import WorkspaceLayout from "../components/layout/WorkspaceLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Toast from "../components/ui/Toast.jsx";
import WelcomeBanner from "../features/products/components/WelcomeBanner.jsx";
import ProductStats from "../features/products/components/ProductStats.jsx";
import ProductCollection from "../features/products/components/ProductCollection.jsx";
import WorkspaceDialogs from "../components/WorkspaceDialogs.jsx";
import { useWorkspace } from "../hooks/useWorkspace.js";
import { MODAL } from "../constants/app.js";
import { useEffect, useState } from "react";
import OrdersPage from "./OrdersPage.jsx";
import PaymentResult from "../components/PaymentResult.jsx";

export default function ProductsPage() {
  const workspace = useWorkspace();
  const [screen, setScreen] = useState(() => window.location.hash === "#orders" || new URLSearchParams(window.location.search).has("order") ? "orders" : "products");
  useEffect(() => {
    const navigate = () => setScreen(window.location.hash === "#orders" ? "orders" : "products");
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const { user, products, loading, account, add, open, notice } = workspace;
  return (
    <>
      <WorkspaceLayout
        user={user}
        productCount={products.length}
        loading={loading}
        onAccount={account}
        screen={screen}
      >
        <PaymentResult user={user} />
        {screen === "orders" ? <OrdersPage key={user?.id || user?._id || "guest"} user={user} onSignIn={() => open(MODAL.AUTH)} /> : <>
        <section className="mb-7 flex items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-[9px] font-medium tracking-[.18em] text-stone-500">
              YOUR WORKSPACE, SIMPLIFIED
            </p>
            <h1 className="text-4xl font-semibold tracking-tighter">
              Products<span className="text-[#7b9361]">.</span>
            </h1>
            <p className="mt-2 max-w-64 text-xs leading-5 text-stone-500 sm:max-w-none">
              Keep your collection organized and ready for what’s next.
            </p>
          </div>
          <Button disabled={loading} className="shrink-0" onClick={add}>
            ＋ <span>Add product</span>
          </Button>
        </section>
        <WelcomeBanner />
        <ProductStats products={products} />
        <ProductCollection
          {...workspace}
          onSignIn={() => open(MODAL.AUTH)}
          onEdit={(product) => open(MODAL.PRODUCT, product)}
          onDelete={(product) => open(MODAL.DELETE, product)}
        />
        </>}
      </WorkspaceLayout>
      <WorkspaceDialogs workspace={workspace} />
      <Toast message={notice} />
    </>
  );
}
