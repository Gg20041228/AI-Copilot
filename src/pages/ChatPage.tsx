import { useEffect, useMemo, useState } from "react";
import { Layout, Button } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { ChatHeader } from "../components/ChatHeader";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { HistorySider } from "../components/HistorySider";
import { useAppSelector } from "../store/hooks";
import { supabase } from "../lib/supabase";
import "./ChatPage.css";

const { Sider, Content, Footer } = Layout;

export const ChatPage = () => {
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(false);
  const [userName, setUserName] = useState("同学");
  const { messages } = useAppSelector((state) => state.chat);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const emailName = user?.email?.split("@")[0]?.trim();
      if (emailName) setUserName(emailName);
    });
  }, []);

  const welcomeTitle = useMemo(() => `${userName}，我需要为您做什么？`, [userName]);

  return (
    <Layout className="app-layout chat-page-layout">
      <Button
        type="text"
        className="sider-toggle-btn"
        icon={isSiderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setIsSiderCollapsed((prev) => !prev)}
        aria-label={
          isSiderCollapsed ? "Expand history panel" : "Collapse history panel"
        }
      />

      <Sider
        className="history-sider"
        width={280}
        collapsedWidth={0}
        collapsible
        trigger={null}
        collapsed={isSiderCollapsed}
        onCollapse={setIsSiderCollapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setIsSiderCollapsed(broken)}
      >
        <HistorySider />
      </Sider>

      <Layout className="chat-main-layout chat-page-main">
        <ChatHeader />

        <Content className="chat-content chat-page-content">
          {hasMessages ? (
            <MessageList />
          ) : (
            <section className="chat-empty-state">
              <h1 className="chat-empty-title">{welcomeTitle}</h1>
              <p className="chat-empty-subtitle">可以直接输入岗位、技术栈或面试方向</p>
              <MessageInput variant="center" />
            </section>
          )}
        </Content>

        {hasMessages && (
          <Footer className="chat-footer chat-page-footer">
            <MessageInput />
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};
