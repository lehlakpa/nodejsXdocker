import { useEffect, useState } from "react";
import { authApi } from "../api/auth.api.js";
import { productsApi } from "../api/products.api.js";
import { MODAL, TOAST_DURATION_MS } from "../constants/app.js";
import { validateProduct, selectProducts } from "../utils/products.js";
import { MESSAGES } from "../constants/messages.js";
import { getErrorMessage } from "../utils/feedback.js";

export function useWorkspace() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [modal, setModal] = useState(null);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function initialize() {
      let action = 'session';
      try {
        const session = await authApi.me({ signal: controller.signal });
        if (!active) return;
        setUser(session.user);
        action = 'load';
        const data = await productsApi.list({ signal: controller.signal });
        if (active) {
          setProducts(data.products);
          setLoaded(true);
        }
      } catch (err) {
        if (active) {
          if (err.status === 401) {
            setUser(null);
            setProducts([]);
            setLoaded(false);
          } else setStatus(getErrorMessage(err, action));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    initialize();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function open(type, product) {
    if (loading || busy) return;
    setError("");
    setModal({ type, product });
  }
  function account() {
    open(user ? MODAL.ACCOUNT : MODAL.AUTH);
  }
  function add() {
    open(user ? MODAL.PRODUCT : MODAL.AUTH);
  }
  function handleFailure(err, action) {
    if (err.status === 401) {
      setUser(null);
      setProducts([]);
      setLoaded(false);
      setModal({ type: MODAL.AUTH });
      setError(MESSAGES.sessionExpired);
    } else setError(getErrorMessage(err, action));
  }
  async function refresh() {
    if (!user) return open(MODAL.AUTH);
    setLoading(true);
    setStatus("");
    try {
      const data = await productsApi.list();
      setProducts(data.products);
      setLoaded(true);
    } catch (err) {
      if (err.status === 401) handleFailure(err);
      else setStatus(getErrorMessage(err, 'load'));
    } finally {
      setLoading(false);
    }
  }
  async function authenticate(values) {
    setBusy(true);
    setError("");
    const body = { ...values, username: values.username.trim() };
    let accountCreated = false;
    let action = register ? 'register' : 'login';
    try {
      if (register) {
        body.fullName = body.fullName.trim();
        await authApi.register(body);
        accountCreated = true;
        setRegister(false);
      }
      action = 'login';
      const session = await authApi.login({
        username: body.username,
        password: body.password,
      });
      setUser(session.user);
      setModal(null);
      setNotice(accountCreated ? MESSAGES.accountCreated : MESSAGES.signedIn);
      setStatus("");
      setLoading(true);
      try {
        const data = await productsApi.list();
        setProducts(data.products);
        setLoaded(true);
      } catch (err) {
        if (err.status === 401) handleFailure(err);
        else setStatus(getErrorMessage(err, 'load'));
      } finally {
        setLoading(false);
      }
    } catch (err) {
      setError(accountCreated ? MESSAGES.accountCreatedSignInFailed : getErrorMessage(err, action));
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(values) {
    setError("");
    let body;
    try {
      body = validateProduct(values);
    } catch (err) {
      setError(err.message);
      return;
    }
    setBusy(true);
    try {
      const id = modal.product?._id;
      const data = await (id
        ? productsApi.update(id, body)
        : productsApi.create(body));
      setProducts((current) =>
        id
          ? current.map((p) => (p._id === id ? data.product : p))
          : [data.product, ...current],
      );
      setModal(null);
      setNotice(id ? MESSAGES.productUpdated(data.product.title) : MESSAGES.productAdded(data.product.title));
    } catch (err) {
      handleFailure(err, 'save');
    } finally {
      setBusy(false);
    }
  }
  async function removeProduct() {
    setBusy(true);
    setError("");
    try {
      const id = modal.product._id;
      await productsApi.remove(id);
      setProducts((current) => current.filter((p) => p._id !== id));
      setModal(null);
      setNotice(MESSAGES.productDeleted(modal.product.title));
    } catch (err) {
      handleFailure(err, 'delete');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await authApi.logout();
      setUser(null);
      setProducts([]);
      setLoaded(false);
      setQuery("");
      setStatus("");
      setModal(null);
      setNotice(MESSAGES.signedOut);
    } catch (err) {
      setError(getErrorMessage(err, 'logout'));
    } finally {
      setBusy(false);
    }
  }

  const filtered = selectProducts(products, query, sort);
  return {
    user,
    products,
    filtered,
    loading,
    loaded,
    status,
    query,
    setQuery,
    sort,
    setSort,
    modal,
    closeModal: () => setModal(null),
    register,
    toggleRegister: () => {
      setRegister((current) => !current);
      setError("");
    },
    busy,
    error,
    notice,
    open,
    account,
    add,
    refresh,
    authenticate,
    saveProduct,
    removeProduct,
    logout,
  };
}
