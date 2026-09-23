import { appRoutes } from "@/core/router/appRoutes";
import { useRoutes } from "react-router-dom";

function App() {
  return useRoutes([...appRoutes]);
}

export default App;
