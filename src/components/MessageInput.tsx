import { useState, useRef } from "react";
import { Input, Button, Upload, message, Tooltip } from "antd";
import {
  SendOutlined,
  PaperClipOutlined,
  FilePdfOutlined,
  LoadingOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { useChatStream } from "../hooks/useChatStream";
import { setResumeContext } from "../store/chatSlice";
import { extractTextFromPDF } from "../utils/pdfParser";
import "./MessageInput.css";

interface MessageInputProps {
  variant?: "footer" | "center";
}

export const MessageInput = ({ variant = "footer" }: MessageInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const resumeContext = useAppSelector((state) => state.chat.resumeContext);

  const dispatch = useAppDispatch();
  const { sendMessage, stopStreaming } = useChatStream();

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  // --- 处理纯前端 PDF 解析 ---
  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      message.error("只能上传 PDF 格式的简历！");
      return Upload.LIST_IGNORE;
    }

    setIsParsing(true);
    message.loading({ content: "正在本地解析简历...", key: "pdf-parse" });

    try {
      const text = await extractTextFromPDF(file);
      if (text.trim().length < 50) {
        message.warning({
          content: "解析出来的文字太少，可能是图片型PDF！",
          key: "pdf-parse",
        });
      } else {
        dispatch(setResumeContext(text));
        message.success({
          content: "简历已加载！AI 已准备好针对简历提问。",
          key: "pdf-parse",
        });
      }
    } catch (error) {
      message.error({
        content: "解析失败，请检查文件是否损坏",
        key: "pdf-parse",
      });
    } finally {
      setIsParsing(false);
    }

    return false; // 拦截默认的网络上传请求
  };

  // 初始化语音识别
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      message.error("您的浏览器不支持语音输入，请使用 Chrome。");
      return;
    }

    // 中断 AI 正在说的废话（当你想插嘴时）
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "zh-CN";
    recognitionRef.current.interimResults = true; // 允许实时返回临时结果

    recognitionRef.current.onstart = () => setIsRecording(true);

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // 实时将语音结果上屏到输入框
      if (finalTranscript || interimTranscript) {
        setInputValue((prev) => {
          // 这里简单处理：每次替换输入框内容，或者你可以设计追加逻辑
          return finalTranscript || interimTranscript;
        });
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("语音识别错误:", event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => setIsRecording(false);

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className={`message-input-wrap message-input-wrap-${variant}`}>
      <div className="message-input-shell">
        <Input.TextArea
          className="message-input-textarea"
          bordered={false}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            resumeContext
              ? "简历已加载，输入'开始面试'或任何问题"
              : "有问题 尽管问"
          }
          autoSize={{ minRows: 1, maxRows: 5 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              if (e.nativeEvent.isComposing) return;
              handleSend();
            }
          }}
        />

        {/* 🌟 新增：把按钮组包起来，方便 Flex 布局并排 */}
        <div className="message-input-actions">
          {isLoading ? (
            <Tooltip title="停止生成">
              <Button
                type="primary"
                shape="circle"
                className="message-input-send-btn"
                icon={<StopOutlined />}
                onClick={stopStreaming}
                aria-label="Stop generation"
              />
            </Tooltip>
          ) : (
            <Tooltip title="发送">
              <Button
                type="primary"
                shape="circle"
                className="message-input-send-btn"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                aria-label="Send message"
              />
            </Tooltip>
          )}

          {/* 上传简历按钮 */}
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".pdf"
            disabled={isParsing || isLoading}
          >
            <Tooltip title={resumeContext ? "重新上传简历" : "上传PDF简历"}>
              <Button
                shape="circle"
                className={`message-input-upload-btn ${resumeContext ? "has-resume" : ""}`}
                icon={
                  isParsing ? (
                    <LoadingOutlined />
                  ) : resumeContext ? (
                    <FilePdfOutlined />
                  ) : (
                    <PaperClipOutlined />
                  )
                }
                aria-label="Upload Resume"
              />
            </Tooltip>
          </Upload>
          <Tooltip title={isRecording ? "点击停止识别" : "语音输入 (插话)"}>
            <Button
              shape="circle"
              className={`message-input-upload-btn ${isRecording ? "is-recording" : ""}`}
              icon={
                isRecording ? (
                  <AudioMutedOutlined style={{ color: "red" }} />
                ) : (
                  <AudioOutlined />
                )
              }
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
