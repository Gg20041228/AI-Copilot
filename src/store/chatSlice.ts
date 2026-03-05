import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../lib/supabase";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  session_id?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  sessions: Session[];
  currentSessionId: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  sessions: [],
  currentSessionId: null,
};

// ==========================================
// 核心：异步 Thunks (与 Supabase 数据库交互)
// ==========================================

// 1. 获取当前用户的所有历史会话
export const fetchHistorySessions = createAsyncThunk(
  "chat/fetchSessions",
  async (userId: string) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // 按时间倒序，最新的在上面

    if (error) throw error;
    return data as Session[];
  },
);

// 2. 创建一个全新的会话
export const createNewSession = createAsyncThunk(
  "chat/createSession",
  async ({
    userId,
    title = "新面试模拟",
  }: {
    userId: string;
    title?: string;
  }) => {
    const { data, error } = await supabase
      .from("sessions")
      .insert([{ user_id: userId, title }])
      .select()
      .single(); // 要求只返回插入的那一行数据

    if (error) throw error;
    return data as Session;
  },
);

// 3. 获取某个特定会话的所有历史聊天记录
export const fetchSessionMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (sessionId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }); // 聊天记录必须按时间正序排列

    if (error) throw error;
    return data as Message[];
  },
);

// 4. 将单条消息保存到数据库
export const saveMessageToDB = createAsyncThunk(
  "chat/saveMessage",
  async (message: Omit<Message, "id"> & { session_id: string }) => {
    // 忽略前端生成的临时 id，让 Supabase 自己生成 UUID
    const { role, content, session_id } = message;
    const { data, error } = await supabase
      .from("messages")
      .insert([{ role, content, session_id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
);

// 5. 重命名会话
export const renameSession = createAsyncThunk(
  "chat/renameSession",
  async ({ sessionId, title }: { sessionId: string; title: string }) => {
    const { error } = await supabase
      .from("sessions")
      .update({ title })
      .eq("id", sessionId);

    if (error) throw error;
    return { sessionId, title };
  },
);

// 6. 删除会话
export const deleteSession = createAsyncThunk(
  "chat/deleteSession",
  async (sessionId: string) => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
    return sessionId;
  },
);

// ==========================================
// Redux Slice 逻辑
// ==========================================

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    // 乐观更新：用户发消息时，先立刻展示在页面上，不等数据库响应，体验极速
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateMessageContent: (
      state,
      action: PayloadAction<{ id: string; text: string }>,
    ) => {
      const message = state.messages.find((m) => m.id === action.payload.id);
      if (message) {
        message.content += action.payload.text;
      }
    },
    setCurrentSession: (state, action: PayloadAction<string | null>) => {
      state.currentSessionId = action.payload;
      if (action.payload === null) {
        state.messages = [];
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.currentSessionId = null;
    },
  },
  // 监听上面的异步 Thunks 的生命周期
  extraReducers: (builder) => {
    // 获取会话列表成功后，覆盖本地 state
    builder.addCase(fetchHistorySessions.fulfilled, (state, action) => {
      state.sessions = action.payload;
    });
    // 创建新会话成功后，把它插到列表最前面，并自动聚焦到这个新会话
    builder.addCase(createNewSession.fulfilled, (state, action) => {
      state.sessions.unshift(action.payload);
      state.currentSessionId = action.payload.id;
      state.messages = [];
    });
    // 获取历史消息成功后，覆盖右侧聊天区域
    builder.addCase(fetchSessionMessages.fulfilled, (state, action) => {
      state.messages = action.payload;
    });
    // 处理重命名成功
    builder.addCase(renameSession.fulfilled, (state, action) => {
      const session = state.sessions.find(
        (s) => s.id === action.payload.sessionId,
      );
      if (session) {
        session.title = action.payload.title;
      }
    });

    // 处理删除成功
    builder.addCase(deleteSession.fulfilled, (state, action) => {
      // 从列表中剔除被删除的会话
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);

      // 如果删除的正好是当前正在看的会话，我们要清空右侧聊天区，并把焦点置空
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = null;
        state.messages = [];
      }
    });
  },
});

export const {
  addMessage,
  updateMessageContent,
  setCurrentSession,
  setLoading,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
