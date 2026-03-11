import * as pdfjsLib from "pdfjs-dist";

// 🌟 核心修改：利用 Vite 的 ?url 语法，直接将本地 node_modules 里的 worker 作为静态资源引入
// 这样就彻底摆脱了外部 CDN 的网络限制和版本不一致问题
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * 纯前端解析 PDF 文件，提取所有纯文本内容
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // 加载 PDF 文档
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    // 遍历每一页提取文字
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // 将这一页的所有文本块拼接起来
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("PDF 解析失败:", error);
    throw new Error("简历解析失败，请确保上传的是有效的文本型 PDF");
  }
};
