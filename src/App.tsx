import { HashRouter, Route } from "@solidjs/router";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";

export default function App() {
  return (
    <HashRouter>
      <Route path="/" component={Home} />
      <Route path="/lesson/:id" component={GamePage} />
    </HashRouter>
  );
}
