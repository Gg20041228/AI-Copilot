export const ttsQueue = {
  isSpeaking: false,

  preferredVoiceName: "Microsoft Kangkang - Chinese (Simplified, PRC)", // 可根据需要调整为其他中文语音

  speak: (text: string) => {
    if (!("speechSynthesis" in window)) return;

    const cleanText = text.replace(/[*#`_]/g, "");
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "zh-CN";
    utterance.rate = 1.4;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let targetVoice = voices.find(
      (v) => v.name === ttsQueue.preferredVoiceName,
    );

    // 如果换了台电脑没找到这个特定声音，就随便抓一个中文声音垫背
    if (!targetVoice) {
      targetVoice = voices.find(
        (v) => v.lang.includes("zh") || v.name.includes("Chinese"),
      );
    }

    if (targetVoice) utterance.voice = targetVoice;
    window.speechSynthesis.speak(utterance);
  },

  cancel: () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};
