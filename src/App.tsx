import { Route, Router } from "@solidjs/router";
import Home from "./pages/Home";
import LessonsPage from "./pages/LessonsPage";
import GamePage from "./pages/GamePage";
import PracticePage from "./pages/PracticePage";

export default function App() {
  return (
    <Router>
      {/* Landing: two ungated doors, Lessons and Practice. The lesson list
          itself lives on /lessons, not here. */}
      <Route path="/" component={Home} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/lesson/:id" component={GamePage} />
      {/* Endless practice: no :id, because it is not a lesson and never
          resolves through the catalog or the progress store. */}
      <Route path="/practice" component={PracticePage} />
    </Router>
  );
}
