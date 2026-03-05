import { useEffect, useRef, useState } from "react";
import { Avatar } from "antd";
import {
  UserOutlined,
  RobotOutlined,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../store/hooks";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./MessageList.css";
import remarkGfm from "remark-gfm";

// --- 核心新增：独立的 CodeBlock 组件 ---
const CodeBlock = ({
  language,
  value,
}: {
  language: string;
  value: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    // 调用现代浏览器的 Clipboard API
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      // 2秒后恢复成"复制"状态
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        borderRadius: "8px",
        overflow: "hidden",
        margin: "12px 0",
        border: "1px solid #333",
      }}
    >
      {/* 代码块头部：显示语言和复制按钮 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 16px",
          backgroundColor: "#2d2d2d", // 配合 vscDarkPlus 的深灰背景
          color: "#ccc",
          fontSize: "12px",
          userSelect: "none",
        }}
      >
        <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>
          {language || "text"}
        </span>
        <div
          onClick={handleCopy}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
        >
          {isCopied ? (
            <>
              <CheckOutlined style={{ color: "#52c41a" }} /> <span>已复制</span>
            </>
          ) : (
            <>
              <CopyOutlined /> <span>复制代码</span>
            </>
          )}
        </div>
      </div>

      {/* 代码高亮主体 */}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0",
          fontSize: "14px",
          padding: "16px",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
// --- CodeBlock 组件结束 ---

export const MessageList = () => {
  const { messages, isLoading } = useAppSelector((state) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); //指向滚动容器
  // 新增：记录用户是否正在手动滚动/翻阅
  const isAutoScrolling = useRef(true);
  // 1. 监听用户手动滚动的行为
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    // 只要距离底部超过 100px，我们就认为用户在“往回看”，关闭自动滚动
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.offsetHeight;
    isAutoScrolling.current = distanceToBottom < 100;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 判断逻辑：当前滚动位置距离真正的底部的偏差
    // offsetHeight: 容器高度, scrollTop: 已经滚上去的高度, scrollHeight: 内容总高度
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.offsetHeight <
      150;
    // 150 是阈值，意味着只要距离底部不到 150px，我们就认为是“触底状态”

    // 只有在加载中（流式输出时）且 用户本来就在底部时，才执行滚动
    if (isLoading && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    // 如果是用户刚发完消息（第一次 messages 长度变多），也可以强制滚一次
  }, [messages, isLoading]);

  // 2. 使用 useLayoutEffect 确保在内容撑开后、屏幕刷新前进行判断
  // 这能有效防止“先闪跳一下再拉回”的视觉抖动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 只有当加载中 且 处于自动滚动模式时才执行
    if (isLoading && isAutoScrolling.current) {
      // 使用 requestAnimationFrame 确保滚动发生在浏览器渲染帧中
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); // 流式输出建议用 auto，smooth 会导致累积抖动
      });
    }
  }, [messages, isLoading]);

  return (
    <div
      className="message-list-wrap"
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: "auto", height: "100%" }}
    >
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}
          >
            <div
              className="message-space"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                flexDirection: isUser ? "row-reverse" : "row",
                maxWidth: "100%",
              }}
            >
              <Avatar
                className={`message-avatar ${isUser ? "message-avatar-user" : "message-avatar-assistant"}`}
                icon={isUser ? <UserOutlined /> : <RobotOutlined />}
                style={{ flexShrink: 0 }}
              />
              <div
                className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-assistant"}`}
                style={{ overflowX: "auto", width: "100%" }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  children={msg.content}
                  components={{
                    // 拦截所有的 <code> 标签
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const rawCode = String(children).replace(/\n$/, "");

                      return !inline && match ? (
                        // 命中多行代码块，交给咱们刚才抽离的 CodeBlock 组件渲染
                        <CodeBlock language={match[1]} value={rawCode} />
                      ) : (
                        // 行内单行代码，保持极简样式
                        <code
                          {...props}
                          className={className}
                          style={{
                            backgroundColor: "rgba(0,0,0,0.08)",
                            padding: "2px 4px",
                            borderRadius: "4px",
                            color: "#d14",
                          }}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="message-row message-row-assistant">
          <div
            className="message-space"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              flexDirection: "row",
            }}
          >
            <Avatar
              className="message-avatar message-avatar-assistant"
              style={{ flexShrink: 0 }}
              icon={<RobotOutlined />}
            />
            <div
              className="thinking-text"
              style={{ padding: "10px 0", color: "#999" }}
            >
              面试官正在思考中...
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
