import { Toaster } from "@/common/components/ui";
import { appRoutes } from "@/core/router/appRoutes";
import { AuthBootstrap } from "@/modules/auth";
import { useRoutes } from "react-router-dom";

function App() {
  const routes = useRoutes(appRoutes);
  return (
    <>
      <AuthBootstrap>{routes}</AuthBootstrap>
      <Toaster />
    </>
  );
}

export default App;
