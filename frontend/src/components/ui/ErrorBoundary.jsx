import { Component } from "react";
import Button from "./Button.jsx";

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="grid min-h-screen place-content-center gap-4 bg-stone-50 p-6 text-center text-green-950">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p>Please reload your workspace and try again.</p>
          <Button onClick={() => window.location.reload()}>
            Reload workspace
          </Button>
        </main>
      );
    return this.props.children;
  }
}
