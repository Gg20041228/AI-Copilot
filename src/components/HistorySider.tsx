import { useEffect, useState, useRef } from "react";
import { Typography, Button, message, Dropdown, Modal, Input } from "antd";
import {
  MessageOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchHistorySessions,
  createNewSession,
  fetchSessionMessages,
  setCurrentSession,
  renameSession,
  deleteSession,
} from "../store/chatSlice";
import { supabase } from "../lib/supabase";
import "./HistorySider.css";

const { Text } = Typography;

export const HistorySider = () => {
  const dispatch = useAppDispatch();
  const { sessions, currentSessionId } = useAppSelector((state) => state.chat);
  const [userId, setUserId] = useState<string | null>(null);

  // 内联编辑状态管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        dispatch(fetchHistorySessions(user.id));
      }
    });
  }, [dispatch]);

  const handleCreateSession = async () => {
    if (!userId) return message.error("未获取到用户信息");
    try {
      await dispatch(
        createNewSession({ userId, title: "新面试模拟" }),
      ).unwrap();
    } catch (error: any) {
      message.error("创建会话失败");
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    // 如果正在编辑状态，不要触发切换
    if (editingId) return;
    if (currentSessionId === sessionId) return;

    dispatch(setCurrentSession(sessionId));
    try {
      await dispatch(fetchSessionMessages(sessionId)).unwrap();
    } catch (error: any) {
      message.error("获取会话记录失败");
    }
  };

  // 确认删除逻辑
  const handleDelete = (e: any, sessionId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发切换会话
    Modal.confirm({
      title: "确认删除",
      content: "删除后此会话的聊天记录将不可恢复，是否继续？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await dispatch(deleteSession(sessionId)).unwrap();
          message.success("已删除");
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  // 开启重命名模式
  const startRename = (e: any, sessionId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(sessionId);
    setEditTitle(currentTitle);
    // 延迟聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 提交重命名
  const handleRenameSubmit = async () => {
    if (!editingId) return;
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      try {
        await dispatch(
          renameSession({ sessionId: editingId, title: trimmedTitle }),
        ).unwrap();
      } catch (error) {
        message.error("重命名失败");
      }
    }
    setEditingId(null);
  };

  return (
    <div className="history-sider-inner">
      <div className="history-sider-top">
        <Text className="history-sider-title">历史会话</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="history-new-btn"
          onClick={handleCreateSession}
        >
          新建
        </Button>
      </div>
      <div className="history-list">
        {sessions.map((item) => (
          <div
            key={item.id}
            className={`history-item ${currentSessionId === item.id ? "history-item-active" : ""}`}
            onClick={() => handleSelectSession(item.id)}
          >
            <div className="history-item-content">
              <MessageOutlined className="history-item-icon" />

              {/* 如果当前项处于编辑状态，展示输入框；否则展示普通文本 */}
              {editingId === item.id ? (
                <Input
                  ref={inputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleRenameSubmit} // 失去焦点自动保存
                  onPressEnter={handleRenameSubmit} // 回车保存
                  onClick={(e) => e.stopPropagation()} // 防止输入时触发切换会话
                  className="history-rename-input"
                />
              ) : (
                <span className="history-item-text">{item.title}</span>
              )}
            </div>

            {/* 右侧的 更多 操作下拉菜单 */}
            {!editingId && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "rename",
                      icon: <EditOutlined />,
                      label: "重命名",
                      onClick: (e) =>
                        startRename(e.domEvent, item.id, item.title),
                    },
                    {
                      type: "divider",
                    },
                    {
                      key: "delete",
                      icon: <DeleteOutlined />,
                      label: "删除会话",
                      danger: true,
                      onClick: (e) => handleDelete(e.domEvent, item.id),
                    },
                  ],
                }}
                trigger={["click", "hover"]}
              >
                <div
                  className="history-item-action"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined />
                </div>
              </Dropdown>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
