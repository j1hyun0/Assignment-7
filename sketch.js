let catMood = "idle"; 
let floatingHearts = [];

const MODEL_NAME = "gemini-3.5-flash";

const SYSTEM_PROMPT = `
너는 귀여운 고양이 점술사 "먀로"야.
사용자의 생년월일과 오늘 날짜를 바탕으로 오늘의 연애운을 재미있게 해석해줘.

중요한 규칙:
- 실제 미래 예측처럼 단정하지 말고, 재미용 운세처럼 말해.
- 사주, 궁합, 운명처럼 과학적으로 검증되지 않은 내용을 사실처럼 말하지 마.
- 사용자의 생년월일로부터 나이를 직접 언급하지 마.
- 말투는 귀엽고 따뜻하게 해.
- 결과는 반드시 한국어로 작성해.
- explanation은 3~5문장 정도로 작성해.
- advice는 오늘 연애운을 좋게 만드는 짧은 행동 조언으로 작성해.
- catReaction은 고양이 캐릭터가 직접 말하는 한 문장으로 작성해.
`;

const fortuneSchema = {
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
  additionalProperties: false
};

function setup() {
  const canvas = createCanvas(620, 390);
  canvas.parent("sketch-holder");
  pixelDensity(2);
  textAlign(CENTER, CENTER);

  const keyInput = document.querySelector("#api-key-input");
  const birthInput = document.querySelector("#birth-input");
  const button = document.querySelector("#fortune-button");

  if (window.GEMINI_API_KEY) {
    keyInput.value = window.GEMINI_API_KEY;
  }

  button.addEventListener("click", async () => {
    const apiKey = keyInput.value.trim();
    const birthDate = birthInput.value;

    if (!apiKey) {
      showError("Gemini API Key를 입력해줘!");
      return;
    }

    if (!birthDate) {
      showError("생년월일을 먼저 알려줘!");
      return;
    }

    button.disabled = true;
    button.textContent = "먀로가 수정구슬 보는 중...";
    catMood = "thinking";
    hideResult();

    try {
      const fortune = await generateLoveFortune(apiKey, birthDate);
      showResult(fortune);
      catMood = "happy";
      makeHearts();
    } catch (error) {
      console.error(error);
      showError("앗, API Key나 네트워크를 확인해줘!");
      catMood = "error";
    } finally {
      button.disabled = false;
      button.textContent = "연애운 보러가기";
    }
  });
}

function draw() {
  clear();
  drawBackgroundSparkles();
  drawCrystalBall(width / 2, 252);
  drawCat(width / 2, 175);
  drawSpeech();

  for (let i = floatingHearts.length - 1; i >= 0; i--) {
    floatingHearts[i].y -= floatingHearts[i].speed;
    floatingHearts[i].alpha -= 3;
    drawHeart(floatingHearts[i].x, floatingHearts[i].y, floatingHearts[i].size, floatingHearts[i].alpha);
    if (floatingHearts[i].alpha <= 0) {
      floatingHearts.splice(i, 1);
    }
  }
}

function windowResized() {
  const holder = document.querySelector("#sketch-holder");
  const newWidth = Math.min(620, holder.clientWidth - 36);
  resizeCanvas(newWidth, 390);
}

async function generateLoveFortune(apiKey, birthDate) {
  const today = new Date();
  const todayText = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  const prompt = `
사용자 생년월일: ${birthDate}
오늘 날짜: ${todayText}

위 정보를 바탕으로 오늘의 연애운을 만들어줘.
점수는 너무 극단적이지 않게 55~98점 사이를 주로 사용하되, 입력값과 오늘 날짜를 참고해서 매번 조금 다른 느낌으로 만들어줘.
반드시 JSON 형식으로만 답해줘.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseFormat: {
          text: {
            mimeType: "application/json",
            schema: fortuneSchema
          }
        },
        temperature: 0.9
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("응답 텍스트가 비어 있습니다.");
  }

  return JSON.parse(text);
}

function showResult(fortune) {
  document.querySelector("#result-card").classList.remove("hidden");
  document.querySelector("#score-line").textContent = `오늘의 연애운은 ${fortune.score}점이다냥!`;
  document.querySelector("#fortune-title").textContent = fortune.title;
  document.querySelector("#fortune-explanation").textContent = fortune.explanation;
  document.querySelector("#fortune-advice").textContent = fortune.advice;
  document.querySelector("#fortune-item").textContent = fortune.luckyItem;
  document.querySelector("#cat-reaction").textContent = `“${fortune.catReaction}”`;
}

function showError(message) {
  document.querySelector("#result-card").classList.remove("hidden");
  document.querySelector("#score-line").textContent = "먀옹!";
  document.querySelector("#fortune-title").textContent = "확인이 필요해";
  document.querySelector("#fortune-explanation").textContent = message;
  document.querySelector("#fortune-advice").textContent = "입력값을 확인하고 다시 눌러줘.";
  document.querySelector("#fortune-item").textContent = "차분한 마음";
  document.querySelector("#cat-reaction").textContent = "“괜찮아, 다시 하면 돼!”";
}

function hideResult() {
  document.querySelector("#result-card").classList.add("hidden");
}

function makeHearts() {
  for (let i = 0; i < 18; i++) {
    floatingHearts.push({
      x: random(width / 2 - 130, width / 2 + 130),
      y: random(225, 305),
      size: random(12, 24),
      speed: random(0.8, 2.1),
      alpha: 255
    });
  }
}

function drawBackgroundSparkles() {
  noStroke();
  for (let i = 0; i < 22; i++) {
    const x = noise(i * 10, frameCount * 0.006) * width;
    const y = noise(i * 4, frameCount * 0.006 + 10) * height;
    fill(255, 185, 214, 80);
    circle(x, y, 4 + (i % 4));
  }
}

function drawSpeech() {
  let message = "생년월일을 알려주면 연애운을 봐준다냥";
  if (catMood === "thinking") message = "잠깐만 기다려줘... 수정구슬 확인 중!";
  if (catMood === "happy") message = "오늘은 마음이 몽글몽글해지는 날이다냥!";
  if (catMood === "error") message = "입력값을 다시 확인해달라냥!";

  push();
  translate(width / 2, 42);
  noStroke();
  fill(255, 255, 255, 220);
  rectMode(CENTER);
  rect(0, 0, min(width - 40, 480), 54, 26);
  fill(59, 42, 47);
  textSize(17);
  textStyle(BOLD);
  text(message, 0, 0);
  pop();
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

  // tail
  noFill();
  stroke(88, 62, 65);
  strokeWeight(18);
  arc(95, 34, 80, 80, -HALF_PI, PI / 2);

  // body
  noStroke();
  fill(255, 228, 202);
  ellipse(0, 55, 150, 130);

  // head
  fill(255, 231, 209);
  ellipse(0, -22, 150, 125);

  // ears
  triangle(-62, -62, -36, -118, -8, -62);
  triangle(62, -62, 36, -118, 8, -62);
  fill(255, 171, 192);
  triangle(-51, -67, -36, -99, -19, -67);
  triangle(51, -67, 36, -99, 19, -67);

  // face
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

  // whiskers
  strokeWeight(3);
  line(-52, -10, -91, -22);
  line(-53, 0, -92, 0);
  line(-52, 10, -91, 22);
  line(52, -10, 91, -22);
  line(53, 0, 92, 0);
  line(52, 10, 91, 22);

  // paws
  noStroke();
  fill(255, 215, 191);
  ellipse(-42, 93, 46, 32);
  ellipse(42, 93, 46, 32);

  // star on forehead
  fill(255, 180, 96);
  drawStar(0, -58, 8, 16, 5);

  if (catMood === "thinking") {
    fill(255, 124, 171);
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
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
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