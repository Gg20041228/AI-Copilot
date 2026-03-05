import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 引入 Redux 核心配置
import { Provider } from "react-redux";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 使用 Provider 注入 store */}
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
