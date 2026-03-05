import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Spin } from "antd";

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查当前是否有登录的 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // 监听 auth 状态变化（比如在其他标签页退出了登录）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 还在检测中，展示全屏 Loading
  if (isAuthenticated === null) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // 如果未登录，直接重定向到 /login 页面，并且使用 replace 替换历史记录，防止按返回键又回来
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 验证通过，渲染子组件（即我们的 ChatPage）
  return children;
};
