import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.tsx";
import { QueryProvider } from "./providers/QueryProvider.tsx";
import { MindloomProvider } from "./store/MindloomProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <MindloomProvider>
        <App />
      </MindloomProvider>
    </QueryProvider>
  </StrictMode>,
);
