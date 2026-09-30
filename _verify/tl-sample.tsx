import React from "react";
import ReactDOM from "react-dom/client";
import { MindMap, sampleTree } from "../src/components/MindMap";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MindMap
      data={sampleTree()}
      defaultConfig={{ structure: "timeline" }}
      showToolbar={false}
      fitOnMount
    />
  </React.StrictMode>
);
