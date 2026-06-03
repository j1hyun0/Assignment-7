let apiKeyInput;
let situationInput;
let submitButton;
let resultDiv;

const MODEL_NAME = "gemini-3.5-flash";

function setup() {
  noCanvas();

  const app = select("#app");

  createElement("h1", "내 편 들어주는 AI").parent(app);
  createP("화나는 일을 털어놓으면 AI가 공감해주고, 대신 화내줍니다.").parent(app);

  // secret.js가 없을 때만 API Key 입력칸 표시
  if (typeof GEMINI_API_KEY === "undefined" || !GEMINI_API_KEY) {
    createElement("label", "Gemini API Key").parent(app);
    apiKeyInput = createInput("", "password");
    apiKeyInput.attribute("placeholder", "API Key를 입력하세요");
    apiKeyInput.parent(app);
  }

  createElement("label", "무슨 일이 있었나요?").parent(app);
  situationInput = createElement("textarea");
  situationInput.attribute("placeholder", "예: 친구가 약속에 늦었는데 사과도 대충 해서 너무 화났어.");
  situationInput.parent(app);

  submitButton = createButton("내 편 들어줘");
  submitButton.mousePressed(comfortMe);
  submitButton.parent(app);

  resultDiv = createDiv(`
    <div class="result-card empty">
      <h2>공감 멘트</h2>
      <p>여기에 AI의 공감이 나와요.</p>
    </div>
    <div class="result-card empty">
      <h2>대신 화내기</h2>
      <p>여기에 AI가 대신 화내줘요.</p>
    </div>
  `);
  resultDiv.id("result");
  resultDiv.parent(app);
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

async function comfortMe() {
  const apiKey = getApiKey();
  const situation = situationInput.value().trim();

  if (!apiKey) {
    resultDiv.html(`<p class="notice">Gemini API Key를 먼저 입력해주세요.</p>`);
    return;
  }

  if (!situation) {
    resultDiv.html(`<p class="notice">화났던 상황을 먼저 입력해주세요.</p>`);
    return;
  }

  submitButton.attribute("disabled", "");
  submitButton.html("AI가 내 편 드는 중...");

  resultDiv.html(`
    <div class="loading-box">
      <div class="loader"></div>
      <p>상황을 읽고 있어요...</p>
    </div>
  `);

  const prompt = `
너는 사용자의 편을 들어주는 친구 같은 AI야.
사용자가 화났던 일을 털어놓으면, 먼저 감정을 진심으로 인정하고 공감해줘.
그 다음에는 사용자를 대신해서 유머러스하고 속 시원하게 화내줘.

사용자가 털어놓은 상황:
${situation}

응답 규칙:
1. 사용자의 감정을 먼저 인정해줘.
2. 공감 멘트는 따뜻하고 친구 같은 말투로 써줘.
3. 대신 화내는 멘트는 속 시원하지만 너무 공격적이지 않게 써줘.
4. 욕설, 혐오표현, 폭력, 협박, 실제 보복을 부추기는 말은 하지 마.
5. 조언은 길게 하지 말고, 이번 프로젝트에서는 공감과 대신 화내기에 집중해.
6. 반드시 JSON 형식으로만 답해줘.
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          empathy: {
            type: "string",
            description: "사용자의 감정을 인정하고 공감하는 멘트"
          },
          anger: {
            type: "string",
            description: "사용자를 대신해 유머러스하고 안전하게 화내주는 멘트"
          }
        },
        required: ["empathy", "anger"]
      }
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);

    showResult(parsed);
  } catch (error) {
    console.error(error);
    resultDiv.html(`
      <p class="notice">오류가 발생했습니다.</p>
      <p class="error-message">${error.message}</p>
    `);
  } finally {
    submitButton.removeAttribute("disabled");
    submitButton.html("내 편 들어줘");
  }
}

function showResult(data) {
  resultDiv.html(`
    <div class="result-card empathy-card">
      <h2>공감 멘트</h2>
      <p>${data.empathy}</p>
    </div>

    <div class="result-card anger-card">
      <h2>대신 화내기</h2>
      <p>${data.anger}</p>
    </div>
  `);
}