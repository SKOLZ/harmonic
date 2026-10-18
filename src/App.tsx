import { Route, Router } from "@solidjs/router";
import Home from "./pages/Home";
import LessonsPage from "./pages/LessonsPage";
import GamePage from "./pages/GamePage";
import PracticeHubPage from "./pages/PracticeHubPage";
import PracticePage from "./pages/PracticePage";

export default function App() {
  return (
    <Router>
      {/* Landing: two ungated doors, Lessons and Practice. The lesson list
          itself lives on /lessons, not here. */}
      <Route path="/" component={Home} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/lesson/:id" component={GamePage} />
      {/* Practice: the hub lists the topic registry, the slug route runs one
          entry of it. The static path outranks the dynamic sibling, so the
          hub never swallows a topic URL and a topic never resolves as the
          hub — unknown slugs land on the topic route's not-found branch,
          not on the hub. */}
      <Route path="/practice" component={PracticeHubPage} />
      <Route path="/practice/:slug" component={PracticePage} />
    </Router>
  );
}
