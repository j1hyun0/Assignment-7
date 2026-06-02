let apiKey = "";

if (typeof API_KEY !== "undefined" && API_KEY) {
  apiKey = API_KEY;
} else {
  apiKey = apiKeyInput.value().trim();
}

let categorySelect;
let hungerInput;
let budgetInput;
let avoidInput;
let recommendButton;
let resultDiv;

const MODEL_NAME = "gemini-3.5-flash";


function setup() {
  noCanvas();

  const app = select("#app");

  createElement("h1", "오늘 뭐 먹지?").parent(app);
  createP("AI가 해 주는 저메추").parent(app);

  createElement("label", "API Key").parent(app);
  apiKeyInput = createInput("", "password");
  apiKeyInput.attribute("placeholder", "API Key를 입력하세요");
  apiKeyInput.parent(app);

  createElement("label", "음식 종류").parent(app);
  categorySelect = createSelect();
  categorySelect.option("한식");
  categorySelect.option("일식");
  categorySelect.option("중식");
  categorySelect.option("양식");
  categorySelect.option("기타");
  categorySelect.parent(app);

  createElement("label", "배고픔 정도").parent(app);
  hungerInput = createInput("");
  hungerInput.attribute("placeholder", "예: 조금 배고픔, 많이 배고픔, 가볍게 먹고 싶음");
  hungerInput.parent(app);

  createElement("label", "예산").parent(app);
  budgetInput = createInput("");
  budgetInput.attribute("placeholder", "예: 10000원, 15000원, 상관없음");
  budgetInput.parent(app);

  createElement("label", "먹기 싫은 음식 / 조건").parent(app);
  avoidInput = createInput("");
  avoidInput.attribute("placeholder", "예: 매운 음식 싫음, 밀가루 피하고 싶음, 국물 싫음");
  avoidInput.parent(app);

  recommendButton = createButton("메뉴 추천 받기");
  recommendButton.mousePressed(recommendMenu);
  recommendButton.parent(app);

  resultDiv = createDiv("");
  resultDiv.id("result");
  resultDiv.parent(app);
}

async function recommendMenu() {
  const apiKey = apiKeyInput.value().trim();
  const category = categorySelect.value();
  const hunger = hungerInput.value().trim();
  const budget = budgetInput.value().trim();
  const avoid = avoidInput.value().trim();

  if (!apiKey) {
    resultDiv.html("API Key를 먼저 입력해주세요.");
    return;
  }

  if (!hunger || !budget) {
    resultDiv.html("배고픈 정도와 예산을 입력해주세요.");
    return;
  }

  resultDiv.html("AI가 메뉴를 고민하는 중...");

  const prompt = `
너는 사용자의 조건에 맞춰 현실적인 메뉴를 추천해주는 AI야.

사용자 정보:
- 원하는 음식 종류: ${category}
- 배고픔 정도: ${hunger}
- 예산: ${budget}
- 피하고 싶은 음식 또는 조건: ${avoid || "없음"}

조건:
1. 선택한 음식 종류에 맞는 메뉴를 우선 추천해줘.
2. 메뉴를 3개 추천해줘.
3. 각 메뉴마다 추천 이유를 구체적으로 설명해줘.
4. 예상 가격대를 적어줘.
5. 한국에서 쉽게 먹거나 배달시킬 수 있는 메뉴 위주로 추천해줘.
6. 사용자가 피하고 싶은 음식이나 조건은 반드시 피해서 추천해줘.
7. 너무 장황하지 않게 써줘.

반드시 JSON 형식으로만 답해줘.
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
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                menu: { type: "string" },
                reason: { type: "string" },
                price: { type: "string" }
              },
              required: ["menu", "reason", "price"]
            }
          }
        },
        required: ["recommendations"]
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
      <p>오류가 발생했습니다.</p>
      <p>API Key, 모델명, 인터넷 연결을 확인해주세요.</p>
    `);
  }
}

function showResult(data) {
  let html = "<h2>추천 메뉴</h2>";

  data.recommendations.forEach((item, index) => {
    html += `
      <div class="card">
        <h3>${index + 1}. ${item.menu}</h3>
        <p><strong>추천 이유:</strong> ${item.reason}</p>
        <p><strong>예상 가격:</strong> ${item.price}</p>
      </div>
    `;
  });

  resultDiv.html(html);
}