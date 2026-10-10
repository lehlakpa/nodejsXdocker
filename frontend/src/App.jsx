import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import StorePage from "./pages/StorePage.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      {/^\/admin(?:\/|$)/.test(window.location.pathname) ? <ProductsPage /> : <StorePage />}
    </ErrorBoundary>
  );
}
