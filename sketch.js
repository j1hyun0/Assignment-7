let apiKeyInput;
let chatWindow;
let messageInput;
let sendButton;
let resetButton;

const MODEL_NAME = "gemini-2.0-flash";

const SYSTEM_PROMPT = `
너는 사용자의 편을 들어주는 친구 같은 AI야.

사용자가 화났던 일, 짜증났던 일, 억울했던 일을 털어놓으면
카카오톡 친구처럼 자연스럽게 답장해줘.

말투 규칙:
- 너무 상담사처럼 딱딱하게 말하지 말 것
- 친구처럼 편하게 말할 것
- 먼저 사용자의 감정을 인정하고 공감할 것
- 그 다음 사용자를 대신해 살짝 과장되고 유머러스하게 화내줄 것
- 너무 길게 설교하지 말 것
- 한 번에 3~6문장 정도로 답할 것
- 사용자가 이어서 말하면 이전 대화 맥락을 기억하고 자연스럽게 이어갈 것

안전 규칙:
- 욕설은 가능하면 순화해서 사용할 것
- 폭력, 협박, 보복, 괴롭힘을 부추기지 말 것
- 혐오표현은 하지 말 것
- 상대방을 실제로 공격하라고 조언하지 말 것
- 감정 해소용으로만 대신 화내줄 것
`;

let chats = [];

function setup() {
  noCanvas();

  const app = select("#app");

  createElement("h1", "내 편 들어주는 AI").parent(app);
  createP("화나는 일을 카톡하듯이 보내면, AI가 친구처럼 공감하고 대신 화내줍니다.").parent(app);

  if (typeof GEMINI_API_KEY === "undefined" || !GEMINI_API_KEY) {
    const keyBox = createDiv("");
    keyBox.class("key-box");
    keyBox.parent(app);

    createElement("label", "Gemini API Key").parent(keyBox);
    apiKeyInput = createInput("", "password");
    apiKeyInput.attribute("placeholder", "API Key를 입력하세요");
    apiKeyInput.parent(keyBox);
  }

  const phone = createDiv("");
  phone.id("phone");
  phone.parent(app);

  const phoneHeader = createDiv("내 편 들어주는 AI");
  phoneHeader.id("phone-header");
  phoneHeader.parent(phone);

  chatWindow = createDiv("");
  chatWindow.id("chat-window");
  chatWindow.parent(phone);

  addBotMessage("무슨 일 있었어? 여기다 그냥 털어놔. 내가 일단 네 편 들어줄게.");

  const inputArea = createDiv("");
  inputArea.id("input-area");
  inputArea.parent(phone);

  messageInput = createElement("textarea");
  messageInput.attribute("placeholder", "화났던 일을 입력해봐...");
  messageInput.parent(inputArea);

  sendButton = createButton("보내기");
  sendButton.mousePressed(sendMessage);
  sendButton.parent(inputArea);

  resetButton = createButton("대화 초기화");
  resetButton.id("reset-button");
  resetButton.mousePressed(resetChat);
  resetButton.parent(app);

  messageInput.elt.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

function getApiKey() {
  if (typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY) {
    return GEMINI_API_KEY;
  }

  if (apiKeyInput) {
    return apiKeyInput.value().trim();
  }

  return "";
}

async function sendMessage() {
  const apiKey = getApiKey();
  const userText = messageInput.value().trim();

  if (!apiKey) {
    addBotMessage("API Key를 먼저 입력해줘!");
    return;
  }

  if (!userText) {
    return;
  }

  addUserMessage(userText);
  messageInput.value("");

  chats.push({
    role: "user",
    parts: [{ text: userText }]
  });

  showTyping();
  sendButton.attribute("disabled", "");
  sendButton.html("답장 중...");

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: chats,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 500
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    removeTyping();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();

    let botText = data.candidates[0].content.parts[0].text;

    chats.push({
      role: "model",
      parts: [{ text: botText }]
    });

    addBotMessage(botText);
  } catch (error) {
    removeTyping();
    console.error(error);
    addBotMessage("앗 오류가 났어. API Key나 모델명을 한 번 확인해봐!");
  } finally {
    sendButton.removeAttribute("disabled");
    sendButton.html("보내기");
  }
}

function addUserMessage(text) {
  const bubble = createDiv(formatMessage(text));
  bubble.class("message user-message");
  bubble.parent(chatWindow);
  scrollToBottom();
}

function addBotMessage(text) {
  const bubble = createDiv(formatMessage(text));
  bubble.class("message bot-message");
  bubble.parent(chatWindow);
  scrollToBottom();
}

function showTyping() {
  const typing = createDiv(`
    <span></span>
    <span></span>
    <span></span>
  `);
  typing.id("typing");
  typing.class("message bot-message typing");
  typing.parent(chatWindow);
  scrollToBottom();
}

function removeTyping() {
  const typing = select("#typing");
  if (typing) {
    typing.remove();
  }
}

function resetChat() {
  chats = [];
  chatWindow.html("");
  addBotMessage("대화 초기화했어. 다시 말해봐. 무슨 일 있었어?");
}

function scrollToBottom() {
  chatWindow.elt.scrollTop = chatWindow.elt.scrollHeight;
}

function formatMessage(text) {
  return escapeHTML(text).replace(/\n/g, "<br>");
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}