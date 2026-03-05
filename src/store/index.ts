import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer, // 注册chatSlice
  },
});

// 导出 RootState 和 AppDispatch 类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
