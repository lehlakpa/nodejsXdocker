import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <ProductsPage />
    </ErrorBoundary>
  );
}
