import { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Button,
  Avatar,
  Dropdown,
  Space,
  message,
} from "antd";
import { ClearOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAppDispatch } from "../store/hooks";
import { clearChat } from "../store/chatSlice";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./ChatHeader.css";

const { Header } = Layout;
const { Text } = Typography;

export const ChatHeader = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");

  // 组件挂载时，获取当前登录的 Supabase 用户信息
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
  }, []);

  // 退出登录核心逻辑
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 退出前清空内存中的聊天记录，保障隐私安全
      dispatch(clearChat());
      message.success("已安全退出登录");
      navigate("/login");
    } catch (error: any) {
      message.error("退出失败: " + error.message);
    }
  };

  // 下拉菜单项配置
  const dropdownItems = [
    {
      key: "email",
      label: <Text type="secondary">{userEmail}</Text>,
      disabled: true, // 仅展示，不可点击
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      danger: true,
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  return (
    <Header className="chat-header">
      {/* 左侧：Logo 和标题 */}
      <Space className="chat-header-left">
        <Text strong className="chat-title">
          AI Interview Copilot
        </Text>
      </Space>

      {/* 右侧：操作区 (把你原有的清空按钮和头像并排放在一起) */}
      <Space size="middle" className="chat-header-right">
        {/* 保留你原有的清空对话按钮 */}
        <Button
          type="text"
          icon={<ClearOutlined />}
          onClick={() => dispatch(clearChat())}
          className="clear-btn"
        >
          <span className="clear-btn-text">清空对话</span>
        </Button>

        {/* 新增的用户头像与下拉菜单 */}
        <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" arrow>
          <div className="user-dropdown-trigger">
            <Avatar
              style={{ backgroundColor: "#87d068" }}
              icon={<UserOutlined />}
            />
            <span className="user-name">
              {/* 提取邮箱 @ 前面的部分作为用户名展示 */}
              {userEmail ? userEmail.split("@")[0] : "User"}
            </span>
          </div>
        </Dropdown>
      </Space>
    </Header>
  );
};
