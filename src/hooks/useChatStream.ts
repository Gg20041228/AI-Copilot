// src/hooks/useChatStream.ts
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  addMessage,
  updateMessageContent,
  setLoading,
  saveMessageToDB,
  renameSession,
  createNewSession, // 新增：引入创建会话的 Thunk
} from "../store/chatSlice";
import { message } from "antd";
import { supabase } from "../lib/supabase"; // 新增：引入 supabase 获取当前用户

export const useChatStream = () => {
  const dispatch = useAppDispatch();
  const { currentSessionId, messages, sessions } = useAppSelector(
    (state) => state.chat,
  );

  // --- 后台静默生成标题 ---
  const generateTitleSilently = async (
    userText: string,
    aiText: string,
    sessionId: string,
  ) => {
    try {
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "你是一个标题生成器。请根据用户的提问和AI的回答，总结出一个极简的会话标题（必须在8个字以内，不要加任何标点符号或引号）。",
              },
              {
                role: "user",
                content: `用户问：${userText}\n\nAI答：${aiText.substring(0, 100)}`,
              },
            ],
            stream: false,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        let newTitle = data.choices[0].message.content.trim();
        newTitle = newTitle.replace(/['"「」《》]/g, "");
        dispatch(renameSession({ sessionId, title: newTitle }));
      }
    } catch (error) {
      console.error("自动生成标题失败", error);
    }
  };

  // --- 发送消息的核心逻辑 ---
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    let targetSessionId = currentSessionId;
    let isAutoCreated = false; // 标记是否是刚刚自动创建的新会话

    // 🌟 核心改造：如果没有选中会话，我们自动帮用户建一个！
    if (!targetSessionId) {
      dispatch(setLoading(true));
      try {
        // 获取当前登录用户
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          message.error("未获取到用户信息，请重新登录");
          dispatch(setLoading(false));
          return;
        }
        // 阻塞等待：在数据库里新建一条会话记录
        const newSession = await dispatch(
          createNewSession({ userId: user.id, title: "新面试模拟" }),
        ).unwrap();

        // 把目标 ID 切换成刚创建出来的这个全新 ID
        targetSessionId = newSession.id;
        isAutoCreated = true;
      } catch (error) {
        message.error("自动创建会话失败，请重试");
        dispatch(setLoading(false));
        return;
      }
    }

    // 解决闭包陷阱：如果是新创建的，当前会话标题就是默认的。如果是老会话，去列表中找。
    const currentSessionTitle = isAutoCreated
      ? "新面试模拟"
      : sessions.find((s) => s.id === targetSessionId)?.title;

    const userMessageId = Date.now().toString();
    const userMessage = {
      id: userMessageId,
      role: "user" as const,
      content: text,
    };

    dispatch(addMessage(userMessage));
    // 存入数据库时，使用我们最终确定的 targetSessionId
    dispatch(
      saveMessageToDB({
        role: "user",
        content: text,
        session_id: targetSessionId,
      }),
    );
    dispatch(setLoading(true));

    const aiMessageId = (Date.now() + 1).toString();
    dispatch(addMessage({ id: aiMessageId, role: "assistant", content: "" }));

    let fullAiResponse = "";

    try {
      // 容错处理：如果是刚自动创建的新会话，上下文直接给空数组，避免携带脏数据
      const contextMessages = isAutoCreated ? [] : messages;

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [...contextMessages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
        },
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const deltaContent = data.choices[0].delta.content || "";

                fullAiResponse += deltaContent;
                dispatch(
                  updateMessageContent({ id: aiMessageId, text: deltaContent }),
                );
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("API 请求出错", error);
      message.error("网络请求失败，请检查配置或网络环境");
      dispatch(
        updateMessageContent({
          id: aiMessageId,
          text: "\n\n**[网络请求失败，请重试]**",
        }),
      );
    } finally {
      dispatch(setLoading(false));

      if (fullAiResponse) {
        // 保存 AI 回复到数据库
        dispatch(
          saveMessageToDB({
            role: "assistant",
            content: fullAiResponse,
            session_id: targetSessionId,
          }),
        );

        // 如果是初始标题，触发后台静默重命名
        if (currentSessionTitle === "新面试模拟") {
          generateTitleSilently(text, fullAiResponse, targetSessionId);
        }
      }
    }
  };

  return { sendMessage };
};
