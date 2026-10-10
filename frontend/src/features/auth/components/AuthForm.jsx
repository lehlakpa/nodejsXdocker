import Button from "../../../components/ui/Button.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { LIMITS } from "../../../constants/app.js";

export default function AuthForm({ register, busy, onSubmit }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      }}
    >
      <p className="mb-5 text-xs leading-6 text-stone-500">
        {register
          ? "Create an account to start your collection."
          : "Sign in to manage your product collection."}
      </p>
      <fieldset disabled={busy} className="space-y-4">
        {register && (
          <FormField
            label="Full name"
            name="fullName"
            autoComplete="name"
            required
            maxLength={LIMITS.NAME}
          />
        )}
        <FormField
          label="Username"
          name="username"
          autoComplete="username"
          required
          maxLength={LIMITS.USERNAME}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          required
          minLength={register ? LIMITS.PASSWORD_MIN : 1}
        />
        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy
            ? "Please wait…"
            : register
              ? "Create account ↗"
              : "Sign in ↗"}
        </Button>
      </fieldset>
    </form>
  );
}
