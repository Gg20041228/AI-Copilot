import { useRef } from "react";
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
import { ttsQueue } from "../utils/speechQueue";

export const useChatStream = () => {
  const dispatch = useAppDispatch();
  const { currentSessionId, messages, sessions, resumeContext } =
    useAppSelector((state) => state.chat);
  const abortControllerRef = useRef<AbortController | null>(null);
  // const { currentCode } = useAppSelector((state) => state.chat);

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

    ttsQueue.cancel(); // 发送新消息前先取消当前的语音播报，避免重叠

    let targetSessionId = currentSessionId;
    let isAutoCreated = false; // 标记是否是刚刚自动创建的新会话

    // 如果没有选中会话，我们自动帮用户建一个！
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

    abortControllerRef.current = new AbortController();

    let fullAiResponse = "";

    try {
      // 容错处理：如果是刚自动创建的新会话，上下文直接给空数组，避免携带脏数据
      const contextMessages = isAutoCreated ? [] : messages;

      const systemPrompt = resumeContext
        ? `你是一个极其严苛且专业的一线大厂技术总监。用户上传了他的个人简历。
以下是用户的简历内容（由PDF解析而来，可能包含少量格式错乱）：
"""
${resumeContext.substring(0, 3000)}
"""

你的任务是：
1. 扮演面试官，专门针对他简历里的【项目经验】和【技术栈】进行“疯狂追问”。
2. 可以问八股文，但绝对不要问空泛的八股文（比如“什么是闭包”），必须结合简历中的具体项目，问出类似“你在XX项目中遇到了什么难点？”“你写的XX技术在这个业务场景下是如何落地的？”等深度问题。
3. 一次只问一个问题，等待用户回答后再追问。保持极强的压迫感和专业度。
4. 穿插一点计网的问题，比如“你了解HTTP协议吗？也要有手撕题”`
        : `你是一个专业的资深前端面试官，请通过对话来考察候选人的技术水平。一次只问一个问题。`;
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...contextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: text },
      ];
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          signal: abortControllerRef.current.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          },
          // 发起流式请求
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: apiMessages,
            stream: true,
          }),
        },
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      // 获取数据流读取器
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let sentenceBuffer = ""; // 句子缓冲区
        //循环读取字节流
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (sentenceBuffer.trim()) {
              ttsQueue.speak(sentenceBuffer); // 读完了，缓冲区还有残留，读出来
            }
            break;
          }
          // 将字节流解码成文本,并按行分割处理
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          // 逐行解析符合 SSE 格式的数据
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const deltaContent = data.choices[0].delta.content || "";

                fullAiResponse += deltaContent;
                dispatch(
                  updateMessageContent({ id: aiMessageId, text: deltaContent }),
                );

                sentenceBuffer += deltaContent;
                if (/[。！？\n]/.test(deltaContent)) {
                  ttsQueue.speak(sentenceBuffer);
                  sentenceBuffer = ""; // 清空缓冲区，积攒下一句
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("用户手动终止了解析");
      } else {
        console.error("API 请求出错", error);
        message.error("网络请求失败，请检查配置或网络环境");
        dispatch(
          updateMessageContent({
            id: aiMessageId,
            text: "\n\n[网络请求失败，请重试]",
          }),
        );
      }
    } finally {
      dispatch(setLoading(false));
      abortControllerRef.current = null;
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
  //暴露给组件的强制停止方法
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // 杀掉网络请求
      abortControllerRef.current = null;
    }
    ttsQueue.cancel(); // 杀掉正在播报的语音
    dispatch(setLoading(false)); // 恢复输入框状态
  };

  return { sendMessage, stopStreaming };
};
