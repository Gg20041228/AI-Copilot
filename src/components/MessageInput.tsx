import { useState } from "react";
import { Input, Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useAppSelector } from "../store/hooks";
import { useChatStream } from "../hooks/useChatStream";
import "./MessageInput.css";

interface MessageInputProps {
  variant?: "footer" | "center";
}

export const MessageInput = ({ variant = "footer" }: MessageInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const { sendMessage } = useChatStream();

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  return (
    <div className={`message-input-wrap message-input-wrap-${variant}`}>
      <div className="message-input-shell">
        <Input.TextArea
          className="message-input-textarea"
          bordered={false} // 直接让 Ant Design 放弃渲染原生的外边框
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="有问题 尽管问"
          autoSize={{ minRows: 1, maxRows: 5 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              if (e.nativeEvent.isComposing) return;
              handleSend();
            }
          }}
        />
        <Button
          type="primary"
          shape="circle"
          className="message-input-send-btn"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send message"
        />
      </div>
    </div>
  );
};
