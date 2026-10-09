import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import ConfirmAction from "./ui/ConfirmAction.jsx";
import AuthForm from "../features/auth/components/AuthForm.jsx";
import ProductForm from "../features/products/components/ProductForm.jsx";
import { MODAL } from "../constants/app.js";

export default function WorkspaceDialogs({ workspace }) {
  const {
    modal,
    register,
    user,
    busy,
    error,
    closeModal,
    toggleRegister,
    authenticate,
    saveProduct,
    removeProduct,
    logout,
  } = workspace;
  if (!modal) return null;
  const titles = {
    [MODAL.AUTH]: register
      ? "A place for your next idea."
      : "Make yourself at home.",
    [MODAL.PRODUCT]: modal.product ? "Edit product" : "Add a product",
    [MODAL.DELETE]: "Remove this product?",
    [MODAL.ACCOUNT]: user?.fullName,
  };
  return (
    <Modal busy={busy} close={closeModal} title={titles[modal.type]}>
      {modal.type === MODAL.AUTH && (
        <AuthForm
          register={register}
          busy={busy}
          onSubmit={authenticate}
          onToggle={toggleRegister}
        />
      )}
      {modal.type === MODAL.PRODUCT && (
        <ProductForm
          key={modal.product?._id || "new"}
          product={modal.product}
          busy={busy}
          onSubmit={saveProduct}
          onCancel={closeModal}
        />
      )}
      {modal.type === MODAL.DELETE && (
        <ConfirmAction
          busy={busy}
          description={`“${modal.product.title}” will be permanently removed from your collection.`}
          confirmLabel="Delete product"
          cancelLabel="Keep product"
          onCancel={closeModal}
          onConfirm={removeProduct}
        />
      )}
      {modal.type === MODAL.ACCOUNT && (
        <>
          <p className="mb-6 text-xs leading-6 text-stone-500">
            @{user?.username}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={logout}
          >
            {busy ? "Signing out…" : "Sign out ↗"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </Modal>
  );
}
