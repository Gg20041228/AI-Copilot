import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { AuthGuard } from "./components/AuthGuard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录/注册页面，任何人都可以访问 */}
        <Route path="/login" element={<AuthPage />} />

        {/* 聊天主页，必须被 AuthGuard 守卫包裹 */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <ChatPage />
            </AuthGuard>
          }
        />

        {/* 捕获所有未定义路由，重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
