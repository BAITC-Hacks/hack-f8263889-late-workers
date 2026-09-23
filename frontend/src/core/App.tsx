import { appRoutes } from "@/core/router/appRoutes";
import { AuthBootstrap } from "@/modules/auth";
import { useRoutes } from "react-router-dom";

function App() {
  const routes = useRoutes(appRoutes);
  return <AuthBootstrap>{routes}</AuthBootstrap>;
}

export default App;
