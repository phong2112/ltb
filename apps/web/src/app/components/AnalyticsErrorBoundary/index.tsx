import { Component, type ReactNode } from "react";
import { routeTemplateFor, track } from "@/app/services/analytics";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class AnalyticsErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch() {
    track("client_error_occurred", { errorCode: "react_render_error", routeTemplate: routeTemplateFor(window.location.pathname) });
  }
  render() {
    if (this.state.failed) return <main className="flex min-h-screen items-center justify-center p-6"><div className="max-w-md rounded-2xl border bg-white p-6 text-center"><h1 className="text-lg font-bold">Không thể hiển thị trang</h1><p className="mt-2 text-sm text-muted-foreground">Vui lòng tải lại trang để tiếp tục.</p><button type="button" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => window.location.reload()}>Tải lại</button></div></main>;
    return this.props.children;
  }
}
