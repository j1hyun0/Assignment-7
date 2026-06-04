const MODEL_NAMES = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.5-flash"];

const SYSTEM_PROMPT = `
너는 귀여운 고양이 점술사 "먀로"야.
사용자의 생년월일과 오늘 날짜를 바탕으로 오늘의 연애운을 재미있게 해석해줘.

중요한 규칙:
- 실제 미래 예측처럼 단정하지 말고, 재미용 운세처럼 말해.
- 사용자의 생년월일로부터 나이를 직접 언급하지 마.
- 말투는 귀엽고 따뜻하게 해.
- 결과는 반드시 한국어로 작성해.
- explanation은 3~5문장 정도로 작성해.
- advice는 오늘 연애운을 좋게 만드는 짧은 행동 조언으로 작성해.
- catReaction은 고양이 캐릭터가 직접 말하는 한 문장으로 작성해.
`;

const responseSchema = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "오늘의 연애운 점수. 0부터 100 사이의 정수."
    },
    title: {
      type: "string",
      description: "오늘 연애운을 한 줄로 표현한 귀여운 제목."
    },
    explanation: {
      type: "string",
      description: "오늘의 연애운에 대한 3~5문장 설명."
    },
    advice: {
      type: "string",
      description: "오늘 연애운을 좋게 만들 수 있는 짧은 행동 조언."
    },
    luckyItem: {
      type: "string",
      description: "오늘의 행운의 아이템."
    },
    catReaction: {
      type: "string",
      description: "고양이 점술사 먀로가 직접 하는 귀여운 한 문장."
    }
  },
  required: ["score", "title", "explanation", "advice", "luckyItem", "catReaction"],
  propertyOrdering: ["score", "title", "explanation", "advice", "luckyItem", "catReaction"],
  additionalProperties: false
};

let keyInput;
let birthInput;
let fortuneButton;
let errorDetailButton;
let resultCard;
let scoreEl;
let titleEl;
let explanationEl;
let adviceEl;
let itemEl;
let reactionEl;

let receiving = false;
let catMood = "idle";
let floatingHearts = [];
let lastErrorMessage = "";

function setup() {
  createCanvas(720, 560);
  pixelDensity(2);
  textAlign(CENTER, CENTER);
  createDomUI();
}

function createDomUI() {
  const panel = createDiv();
  panel.addClass("ui-panel");

  const form = createDiv();
  form.addClass("form-grid");
  form.parent(panel);

  const keyLabel = createElement("label", "Gemini API Key");
  keyLabel.attribute("for", "api-key-input");
  keyLabel.parent(form);

  keyInput = createInput("", "password");
  keyInput.attribute("id", "api-key-input");
  keyInput.attribute("placeholder", "API Key를 입력해줘");
  keyInput.attribute("autocomplete", "off");
  keyInput.parent(form);

  if (window.GEMINI_API_KEY) {
    keyInput.value(window.GEMINI_API_KEY);
  }

  const birthLabel = createElement("label", "생년월일");
  birthLabel.attribute("for", "birth-input");
  birthLabel.parent(form);

  birthInput = createInput("", "date");
  birthInput.attribute("id", "birth-input");
  birthInput.parent(form);

  fortuneButton = createButton("연애운 보러가기");
  fortuneButton.parent(form);
  fortuneButton.mousePressed(requestFortune);


  resultCard = createDiv();
  resultCard.addClass("result-card");
  resultCard.addClass("hidden");
  resultCard.parent(panel);

  scoreEl = createElement("h2", "");
  scoreEl.addClass("result-score");
  scoreEl.parent(resultCard);

  titleEl = createElement("h3", "");
  titleEl.addClass("result-title");
  titleEl.parent(resultCard);

  explanationEl = createElement("p", "");
  explanationEl.addClass("result-explanation");
  explanationEl.parent(resultCard);

  const meta = createDiv();
  meta.addClass("result-meta");
  meta.parent(resultCard);

  const adviceRow = createDiv();
  adviceRow.addClass("result-row");
  adviceRow.parent(meta);
  const adviceLabel = createElement("strong", "오늘의 조언");
  adviceLabel.parent(adviceRow);
  adviceEl = createElement("span", "");
  adviceEl.parent(adviceRow);

  const itemRow = createDiv();
  itemRow.addClass("result-row");
  itemRow.parent(meta);
  const itemLabel = createElement("strong", "행운의 아이템");
  itemLabel.parent(itemRow);
  itemEl = createElement("span", "");
  itemEl.parent(itemRow);

  reactionEl = createElement("p", "");
  reactionEl.addClass("cat-reaction");
  reactionEl.parent(resultCard);

  errorDetailButton = createButton("오류 자세히 보기");
  errorDetailButton.addClass("error-detail-button");
  errorDetailButton.addClass("hidden");
  errorDetailButton.parent(panel);
  errorDetailButton.mousePressed(() => {
    alert(lastErrorMessage || "아직 자세한 오류가 없어.");
  });
}

function draw() {
  drawAppBackground();
  drawTitleArea();
  drawCatPanel();
  updateHearts();
}

function drawAppBackground() {
  background(255, 243, 248);

  noStroke();
  fill(248, 229, 255);
  circle(70, 80, 140);
  fill(255, 222, 235);
  circle(width - 80, 140, 180);
  fill(244, 235, 255);
  circle(width - 70, height - 70, 180);

  for (let i = 0; i < 26; i++) {
    const x = noise(i * 8, frameCount * 0.006) * width;
    const y = noise(i * 5, frameCount * 0.006 + 30) * height;
    fill(255, 166, 205, 60);
    circle(x, y, 3 + (i % 4));
  }
}

function drawTitleArea() {
  noStroke();
  fill(255, 255, 255, 215);
  rectMode(CENTER);
  rect(width / 2, 76, 580, 112, 32);

  fill(214, 83, 134);
  textStyle(BOLD);
  textSize(14);
  text("AI LOVE FORTUNE", width / 2, 38);

  fill(65, 43, 53);
  textSize(36);
  text("냥냥 연애운 상담소", width / 2, 75);

  fill(118, 91, 101);
  textStyle(NORMAL);
  textSize(15);
  text("생년월일을 알려주면 고양이 점술사 먀로가 오늘의 연애운을 봐준다냥 🐾", width / 2, 113);
}

function drawCatPanel() {
  noStroke();
  fill(255, 255, 255, 220);
  rectMode(CENTER);
  rect(width / 2, 338, 600, 380, 34);

  drawSpeechBubble(width / 2, 190);
  drawCrystalBall(width / 2, 447);
  drawCat(width / 2, 342);
}

function drawSpeechBubble(x, y) {
  let message = "생년월일을 알려주면 연애운을 봐준다냥";
  if (catMood === "thinking") message = "잠깐만 기다려줘... 수정구슬 확인 중!";
  if (catMood === "happy") message = "결과가 나왔다냥! 아래를 확인해봐!";
  if (catMood === "error") message = "먀옹... 오류 자세히 보기를 눌러달라냥!";

  noStroke();
  fill(255, 250, 252, 244);
  rectMode(CENTER);
  rect(x, y, 500, 54, 26);

  fill(59, 42, 47);
  textStyle(BOLD);
  textSize(17);
  text(message, x, y);
}

async function requestFortune() {
  if (receiving) return;

  const apiKey = keyInput.value().trim();
  const birthDate = birthInput.value().trim();

  if (!apiKey) {
    setError("API Key를 입력해줘!", "입력창에 Gemini API Key를 붙여넣고 다시 눌러줘.");
    return;
  }

  if (!birthDate) {
    setError("생년월일을 먼저 알려줘!", "날짜 선택창에서 생년월일을 골라줘.");
    return;
  }

  receiving = true;
  catMood = "thinking";
  fortuneButton.attribute("disabled", "true");
  fortuneButton.html("먀로가 수정구슬 보는 중...");
  hideResult();
  errorDetailButton.addClass("hidden");

  try {
    const fortune = await generateLoveFortune(apiKey, birthDate);
    setFortune(fortune);
    catMood = "happy";
    makeHearts();
  } catch (error) {
    console.error(error);
    lastErrorMessage = error.message;
    setError("앗, 요청 중 오류가 났어.", shortenError(error.message));
    catMood = "error";
    errorDetailButton.removeClass("hidden");
  } finally {
    receiving = false;
    fortuneButton.removeAttribute("disabled");
    fortuneButton.html("연애운 보러가기");
  }
}

function setFortune(fortune) {
  resultCard.removeClass("error-mode");
  const score = constrain(Number(fortune.score) || 0, 0, 100);
  scoreEl.elt.textContent = `오늘의 연애운은 ${score}점이다냥!`;
  titleEl.elt.textContent = fortune.title || "몽글몽글한 하루";
  explanationEl.elt.textContent = fortune.explanation || "오늘은 마음을 편하게 열어보면 좋은 날이에요.";
  adviceEl.elt.textContent = fortune.advice || "가볍게 안부를 건네보세요.";
  itemEl.elt.textContent = fortune.luckyItem || "따뜻한 음료";
  reactionEl.elt.textContent = `“${fortune.catReaction || "먀옹, 오늘도 충분히 귀엽다냥!"}”`;
  resultCard.removeClass("hidden");
}

function setError(title, detail) {
  resultCard.addClass("error-mode");
  scoreEl.elt.textContent = "먀옹!";
  titleEl.elt.textContent = title;
  explanationEl.elt.textContent = detail;
  adviceEl.elt.textContent = "";
  itemEl.elt.textContent = "";
  reactionEl.elt.textContent = "“괜찮아, 다시 하면 돼!”";
  resultCard.removeClass("hidden");
}

function hideResult() {
  resultCard.addClass("hidden");
}

function shortenError(message) {
  if (!message) return "오류 메시지가 비어 있어. 콘솔을 확인해줘.";

  if (message.includes("API_KEY_INVALID")) {
    return "API Key가 잘못되었거나 비활성화된 것 같아. Google AI Studio에서 새 키를 만들어 다시 넣어봐.";
  }
  if (message.includes("PERMISSION_DENIED") || message.includes("403")) {
    return "API Key 권한 또는 웹사이트 제한 문제일 수 있어. 키 제한에서 GitHub Pages 주소를 허용해야 해.";
  }
  if (message.includes("404") || message.toLowerCase().includes("not found")) {
    return "모델명을 찾지 못했어. 오류 자세히 보기에서 어떤 모델이 실패했는지 확인해줘.";
  }
  if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
    return "사용량 제한 또는 할당량 문제일 수 있어. 잠시 뒤 다시 시도해봐.";
  }

  return message.slice(0, 260);
}

async function generateLoveFortune(apiKey, birthDate) {
  const today = new Date();
  const todayText = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  const userPrompt = `
사용자 생년월일: ${birthDate}
오늘 날짜: ${todayText}

위 정보를 바탕으로 오늘의 연애운을 만들어줘.
점수는 너무 극단적이지 않게 55~98점 사이를 주로 사용하되, 입력값과 오늘 날짜를 참고해서 매번 다른 느낌으로 만들어줘.
반드시 JSON 형식으로만 답해줘.
`;

  let lastError = "";

  for (const modelName of MODEL_NAMES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.9
          }
        })
      });

      const rawText = await response.text();
      console.log("model:", modelName, "status:", response.status, "body:", rawText);

      if (!response.ok) {
        lastError = `${modelName} 실패: ${response.status} ${rawText}`;
        continue;
      }

      const data = JSON.parse(rawText);
      const modelMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!modelMessage) {
        lastError = `${modelName} 실패: 응답 텍스트가 비어 있음 ${rawText}`;
        continue;
      }

      return parseJsonFromModel(modelMessage);
    } catch (error) {
      lastError = `${modelName} 실패: ${error.message}`;
      console.error(lastError);
    }
  }

  throw new Error(lastError || "모든 모델 요청에 실패했어.");
}

function parseJsonFromModel(text) {
  if (!text) {
    throw new Error("모델 응답이 비어 있어.");
  }

  let cleaned = text.trim();

  // 모델이 혹시 ```json ... ``` 코드블록으로 감싸서 보내도 처리한다.
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const jsonOnly = cleaned.slice(start, end + 1);
      return JSON.parse(jsonOnly);
    }
    throw new Error("JSON 파싱 실패: " + cleaned.slice(0, 300));
  }
}

function makeHearts() {
  floatingHearts = [];
  for (let i = 0; i < 18; i++) {
    floatingHearts.push({
      x: random(width / 2 - 150, width / 2 + 150),
      y: random(405, 485),
      size: random(12, 24),
      speed: random(0.8, 2.1),
      alpha: 255
    });
  }
}

function updateHearts() {
  for (let i = floatingHearts.length - 1; i >= 0; i--) {
    floatingHearts[i].y -= floatingHearts[i].speed;
    floatingHearts[i].alpha -= 3;
    drawHeart(floatingHearts[i].x, floatingHearts[i].y, floatingHearts[i].size, floatingHearts[i].alpha);
    if (floatingHearts[i].alpha <= 0) {
      floatingHearts.splice(i, 1);
    }
  }
}

function drawCrystalBall(x, y) {
  push();
  translate(x, y);
  noStroke();

  fill(184, 120, 255, 42);
  ellipse(0, 0, 190, 102);

  fill(255, 255, 255, 120);
  circle(0, -8, 128);

  fill(255, 181, 216, 95);
  circle(0, -8, 112);

  fill(255, 255, 255, 115);
  ellipse(-25, -34, 33, 18);

  fill(166, 95, 125, 120);
  rectMode(CENTER);
  rect(0, 62, 128, 32, 12);
  pop();
}

function drawCat(x, y) {
  push();
  translate(x, y + sin(frameCount * 0.04) * 4);

  noFill();
  stroke(88, 62, 65);
  strokeWeight(18);
  arc(95, 34, 80, 80, -HALF_PI, PI / 2);

  noStroke();
  fill(255, 228, 202);
  ellipse(0, 55, 150, 130);

  fill(255, 231, 209);
  ellipse(0, -22, 150, 125);

  triangle(-62, -62, -36, -118, -8, -62);
  triangle(62, -62, 36, -118, 8, -62);
  fill(255, 171, 192);
  triangle(-51, -67, -36, -99, -19, -67);
  triangle(51, -67, 36, -99, 19, -67);

  stroke(59, 42, 47);
  strokeWeight(5);
  noFill();

  if (catMood === "happy") {
    arc(-28, -26, 25, 16, 0, PI);
    arc(28, -26, 25, 16, 0, PI);
  } else if (catMood === "thinking") {
    line(-39, -31, -18, -28);
    line(18, -28, 39, -31);
  } else {
    line(-39, -29, -18, -29);
    line(18, -29, 39, -29);
  }

  noStroke();
  fill(255, 126, 171, 150);
  ellipse(-45, -3, 22, 12);
  ellipse(45, -3, 22, 12);

  fill(59, 42, 47);
  triangle(-7, -12, 7, -12, 0, -3);

  stroke(59, 42, 47);
  strokeWeight(4);
  noFill();
  arc(-8, 2, 17, 14, 0, PI);
  arc(8, 2, 17, 14, 0, PI);

  strokeWeight(3);
  line(-52, -10, -91, -22);
  line(-53, 0, -92, 0);
  line(-52, 10, -91, 22);
  line(52, -10, 91, -22);
  line(53, 0, 92, 0);
  line(52, 10, 91, 22);

  noStroke();
  fill(255, 215, 191);
  ellipse(-42, 93, 46, 32);
  ellipse(42, 93, 46, 32);

  fill(255, 180, 96);
  drawStar(0, -58, 8, 16, 5);

  if (catMood === "thinking") {
    fill(255, 124, 171);
    textStyle(BOLD);
    textSize(28);
    text("?", 86, -80);
  }

  pop();
}

function drawHeart(x, y, size, alpha) {
  push();
  translate(x, y);
  scale(size / 24);
  noStroke();
  fill(255, 94, 145, alpha);
  beginShape();
  vertex(0, 8);
  bezierVertex(-24, -8, -10, -28, 0, -13);
  bezierVertex(10, -28, 24, -8, 0, 8);
  endShape(CLOSE);
  pop();
}

function drawStar(x, y, radius1, radius2, npoints) {
  const angle = TWO_PI / npoints;
  const halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}