// // src/components/CodeEditor.tsx
// import Editor from "@monaco-editor/react";
// import { useAppDispatch, useAppSelector } from "../store/hooks";
// // import {
// //   updateCode,
// //   setEditorOpen,
// //   setEditorLanguage,
// // } from "../store/chatSlice";
// import { CloseOutlined, CodeOutlined } from "@ant-design/icons";
// import { Button, Select, Space } from "antd";

// export const CodeEditor = () => {
//   const dispatch = useAppDispatch();
//   // const { currentCode, editorLanguage } = useAppSelector((state) => state.chat);

//   // 语言选项配置
//   const languageOptions = [
//     { value: "javascript", label: "JavaScript" },
//     { value: "typescript", label: "TypeScript" },
//     { value: "python", label: "Python" },
//     { value: "java", label: "Java" },
//     { value: "cpp", label: "C++" },
//   ];

//   return (
//     <div
//       className="editor-wrapper"
//       style={{
//         height: "100%",
//         display: "flex",
//         flexDirection: "column",
//         background: "#1e1e1e",
//         borderLeft: "1px solid #333",
//         overflow: "hidden",
//       }}
//     >
//       {/* 🌟 编辑器顶栏：包含语言切换和关闭按钮 */}
//       <div
//         className="editor-toolbar"
//         style={{
//           height: "40px",
//           background: "#252526",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "0 12px",
//           borderBottom: "1px solid #333",
//         }}
//       >
//         <Space>
//           <CodeOutlined style={{ color: "#007acc" }} />
//           <Select
//             size="small"
//             value={editorLanguage}
//             variant="borderless"
//             style={{ width: 120, color: "#cccccc" }}
//             onChange={(value) => dispatch(setEditorLanguage(value))}
//             options={languageOptions}
//           />
//         </Space>

//         <Button
//           type="text"
//           size="small"
//           icon={<CloseOutlined style={{ color: "#999" }} />}
//           onClick={() => dispatch(setEditorOpen(false))}
//           className="editor-close-btn"
//         />
//       </div>

//       <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
//         <Editor
//           height="100%"
//           // language={editorLanguage} // 动态切换语言
//           theme="vs-dark"
//           // value={currentCode}
//           options={{
//             fontSize: 14,
//             fontFamily: "'Fira Code', 'Courier New', monospace",
//             minimap: { enabled: false },
//             scrollBeyondLastLine: false, // 滚动不超出最后一行
//             automaticLayout: true,
//             tabSize: 2,
//             lineNumbers: "on",
//             padding: { top: 10 },
//             scrollbar: {
//               vertical: "visible",
//               horizontal: "visible",
//               useShadows: false,
//               verticalScrollbarSize: 10,
//               horizontalScrollbarSize: 10,
//             },
//           }}
//           // onChange={(value) => dispatch(updateCode(value || ""))}
//         />
//       </div>
//     </div>
//   );
// };
