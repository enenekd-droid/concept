const app = document.querySelector("#app");

const state = {
  concepts: [],
  user: { name: "", grade: 3 },
  subject: "국어",
  mode: "home",
  quiz: [],
  current: 0,
  answers: [],
  missed: [],
  studyIndex: 0,
  final: [],
  finalAnswers: [],
};

const subjectMap = new Map([
  ["국어", "국어"],
  ["사회", "사회"],
  ["과학", "과학"],
]);

function repairText(value) {
  if (typeof value !== "string") return value;
  if (!/[ÃÂìíêëð]/.test(value)) return value;
  const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 255);
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
}

function repairDeep(value) {
  if (Array.isArray(value)) return value.map(repairDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairDeep(item)]));
  }
  return repairText(value);
}

function normalizeSubject(subject) {
  const fixed = repairText(subject);
  if (fixed.includes("국어")) return "국어";
  if (fixed.includes("사회")) return "사회";
  if (fixed.includes("과학")) return "과학";
  return subjectMap.get(fixed) || fixed;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sample(items, count) {
  return shuffle(items).slice(0, Math.min(count, items.length));
}

function difficultyLabel(level) {
  return ["", "쉬움", "보통", "도전"][level] || "보통";
}

function levelFromScore(score) {
  if (score <= 6) return { title: "병아리 단계", text: "기초 개념부터 천천히 다시 만나면 좋아요.", color: "coral" };
  if (score <= 12) return { title: "새싹 단계", text: "알고 있는 개념이 늘고 있어요. 헷갈린 낱말을 복습해요.", color: "yellow" };
  if (score <= 18) return { title: "튼튼 단계", text: "대부분 잘 이해했어요. 어려운 설명 문제에 도전해요.", color: "blue" };
  return { title: "개념 박사", text: "훌륭해요. 마무리 테스트로 실력을 확인해요.", color: "green" };
}

function getPool() {
  return state.concepts.filter((item) => item.grade === Number(state.user.grade) && normalizeSubject(item.subject) === state.subject);
}

function makeQuestion(concept, index) {
  const answer = index % 4 === 0 ? false : Boolean(concept.quiz?.answer ?? true);
  const question = answer
    ? concept.quiz?.question || `${concept.term}은(는) "${concept.description}"이라는 뜻이다.`
    : `${concept.term}은(는) "${makeWrongDescription(concept)}"이라는 뜻이다.`;
  return { ...concept, quizQuestion: question, quizAnswer: answer };
}

function makeWrongDescription(concept) {
  const candidates = state.concepts.filter((item) => item.id !== concept.id && item.grade === concept.grade);
  return sample(candidates, 1)[0]?.description || "서로 관계없는 내용을 한곳에 모은 것";
}

function startPretest() {
  state.quiz = sample(getPool(), 20).map(makeQuestion);
  state.current = 0;
  state.answers = [];
  state.missed = [];
  state.mode = "quiz";
  render();
}

function startStudy() {
  state.studyIndex = 0;
  state.mode = "study";
  render();
}

function startFinal() {
  const reviewBase = state.missed.length ? state.missed : sample(getPool(), 10);
  state.final = sample([...reviewBase, ...sample(getPool(), 12)], 20).map(makeQuestion);
  state.current = 0;
  state.finalAnswers = [];
  state.mode = "final";
  render();
}

function answerQuiz(answer) {
  const list = state.mode === "final" ? state.final : state.quiz;
  const current = list[state.current];
  const correct = answer === current.quizAnswer;
  if (state.mode === "final") {
    state.finalAnswers.push({ id: current.id, correct });
  } else {
    state.answers.push({ id: current.id, correct });
    if (!correct) state.missed.push(current);
  }
  renderFeedback(correct, current);
}

function nextQuestion() {
  const list = state.mode === "final" ? state.final : state.quiz;
  if (state.current < list.length - 1) {
    state.current += 1;
    render();
    return;
  }
  state.mode = state.mode === "final" ? "finalResult" : "result";
  render();
}

function renderShell(content, progress = 0) {
  app.innerHTML = `
    <header class="topbar">
      <div class="page-context">${state.user.name ? `${state.user.name} · ${state.user.grade}학년 · ${state.subject}` : ""}</div>
      <div class="progress-wrap">
        <div class="progress-label"><span>학습 진행</span><strong>${Math.round(progress)}%</strong></div>
        <div class="progress"><span style="--value:${progress}%"></span></div>
      </div>
    </header>
    ${content}
  `;
}

function renderHome() {
  app.innerHTML = `
    <section class="home-screen">
      <div class="window-bar" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="home-inner">
        <p class="home-kicker">국어 · 사회 · 과학</p>
        <h1><span>도전! 초등</span><br />개념어 마스터</h1>
        <p class="home-subtitle">교과서 속 중요 개념어를 학습하고<br /><span>퀴즈로 실력을 확인해요.</span></p>
        <div class="home-guide">학년을 선택해 주세요.</div>
        <div class="grade-grid" aria-label="학년 선택">
          ${[3, 4, 5, 6].map((grade) => `
            <button class="grade-card" data-grade="${grade}" type="button">
              <span>초등</span>
              <strong>${grade}학년</strong>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
  document.querySelectorAll(".grade-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.user.name = "친구";
      state.user.grade = Number(button.dataset.grade);
      state.mode = "dashboard";
      render();
    });
  });
}

function renderDashboard() {
  const pool = getPool();
  renderShell(`
    <section class="panel">
      <h2>${state.user.grade}학년 학습 선택</h2>
      <p>과목을 고르면 20문제 예비 테스트를 볼 수 있어요.</p>
      <div class="controls">
        <div class="field">
          <label for="subject">과목</label>
          <select class="select" id="subject">
            ${["국어", "사회", "과학"].map((subject) => `<option ${subject === state.subject ? "selected" : ""}>${subject}</option>`).join("")}
          </select>
        </div>
        <button class="btn mint" id="pretest" ${pool.length < 1 ? "disabled" : ""}>예비 테스트</button>
        <button class="btn secondary" id="study">개념어 학습</button>
      </div>
      <div class="stat-row">
        <div class="stat"><strong>${pool.length}</strong><span>개념어</span></div>
        <div class="stat"><strong>${new Set(pool.map((item) => item.unit)).size}</strong><span>단원</span></div>
        <div class="stat"><strong>${pool.filter((item) => item.difficulty === 1).length}</strong><span>쉬움</span></div>
        <div class="stat"><strong>${pool.filter((item) => item.difficulty >= 3).length}</strong><span>도전</span></div>
      </div>
    </section>
  `, 12);
  document.querySelector("#subject").addEventListener("change", (event) => {
    state.subject = event.target.value;
    render();
  });
  document.querySelector("#pretest").addEventListener("click", startPretest);
  document.querySelector("#study").addEventListener("click", startStudy);
}

function renderQuestion() {
  const list = state.mode === "final" ? state.final : state.quiz;
  const current = list[state.current];
  const progress = ((state.current + 1) / list.length) * (state.mode === "final" ? 100 : 52);
  renderShell(`
    <section class="question">
      <div class="meta">${state.mode === "final" ? "마무리 테스트" : "예비 테스트"} · ${state.current + 1}/${list.length}</div>
      <div class="chips">
        <span class="chip">${current.unit}</span>
        <span class="chip">${difficultyLabel(current.difficulty)}</span>
      </div>
      <h2>${current.quizQuestion}</h2>
      <div class="term-card">
        <div class="term">${current.term}</div>
        <div class="description">${current.description}</div>
      </div>
      <div class="answer-grid">
        <button class="answer" data-answer="true">O 맞아요</button>
        <button class="answer" data-answer="false">X 아니에요</button>
      </div>
      <div id="feedback"></div>
    </section>
  `, progress);
  document.querySelectorAll(".answer").forEach((button) => {
    button.addEventListener("click", () => answerQuiz(button.dataset.answer === "true"));
  });
}

function renderFeedback(correct, current) {
  document.querySelectorAll(".answer").forEach((button) => {
    button.disabled = true;
    if ((button.dataset.answer === "true") === current.quizAnswer) button.classList.add("selected");
  });
  document.querySelector("#feedback").innerHTML = `
    <div class="feedback ${correct ? "good" : "bad"}">
      ${correct ? "정답이에요!" : "아쉬워요. 정답을 한 번 더 확인해요."}
      <div class="result-line">${current.term}: ${current.description}</div>
    </div>
    <div class="actions" style="margin-top:12px">
      <button class="btn mint" id="next">다음</button>
    </div>
  `;
  document.querySelector("#next").addEventListener("click", nextQuestion);
}

function renderResult(final = false) {
  const answers = final ? state.finalAnswers : state.answers;
  const score = answers.filter((item) => item.correct).length;
  const level = levelFromScore(score);
  renderShell(`
    <section class="panel">
      <h2>${final ? "마무리 결과" : level.title}</h2>
      <p>${final ? `총 ${score}문제를 맞혔어요. ${score >= 16 ? "성공! 개념을 잘 정리했어요." : "복습 후 다시 도전하면 더 좋아져요."}` : level.text}</p>
      <div class="result-grid">
        <div class="result-card"><h3>정답</h3><strong>${score}/${answers.length}</strong></div>
        <div class="result-card"><h3>정답률</h3><strong>${Math.round((score / answers.length) * 100)}%</strong></div>
        <div class="result-card"><h3>복습 개념</h3><strong>${state.missed.length}</strong></div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button class="btn mint" id="study">학습하기</button>
        <button class="btn coral" id="final">마무리 테스트</button>
        <button class="btn secondary" id="home">과목 선택</button>
      </div>
    </section>
    ${state.missed.length ? renderReviewList() : ""}
  `, final ? 100 : 60);
  document.querySelector("#study").addEventListener("click", startStudy);
  document.querySelector("#final").addEventListener("click", startFinal);
  document.querySelector("#home").addEventListener("click", () => {
    state.mode = "dashboard";
    render();
  });
}

function renderReviewList() {
  return `
    <section class="panel">
      <h2>복습 알고리즘</h2>
      <p>틀린 개념을 먼저 보여주고, 같은 학년 개념을 섞어 마무리 테스트에 다시 냅니다.</p>
      <div class="review-list">
        ${state.missed.slice(0, 8).map((item) => `<div class="review-item"><strong>${item.term}</strong><div>${item.description}</div></div>`).join("")}
      </div>
    </section>
  `;
}

function renderStudy() {
  const pool = getPool();
  const current = pool[state.studyIndex % pool.length];
  const wrong = makeWrongDescription(current);
  renderShell(`
    <section class="panel">
      <h2>개념 학습</h2>
      <p>${state.user.grade}학년 ${state.subject} 개념을 카드로 익히고, OX와 객관식 문제로 확인해요.</p>
      <div class="term-card">
        <div class="chips">
          <span class="chip">${current.unit}</span>
          <span class="chip">${difficultyLabel(current.difficulty)}</span>
        </div>
        <div class="term">${current.term}</div>
        <div class="description">${current.description}</div>
      </div>
      <div class="study-grid">
        <div class="study-card">
          <h3>OX 퀴즈</h3>
          <p>${current.quiz?.question || `${current.term}의 뜻을 알고 있나요?`}</p>
        </div>
        <div class="study-card">
          <h3>AI 객관식</h3>
          <p>${current.term}의 알맞은 뜻은?</p>
          <ol>
            ${shuffle([current.description, wrong, "앞뒤 내용을 살펴 새롭게 예상하는 것"]).slice(0, 3).map((choice) => `<li>${choice}</li>`).join("")}
          </ol>
        </div>
        <div class="study-card">
          <h3>복습 팁</h3>
          <p>개념어를 소리 내어 읽고, 설명 속 핵심 낱말을 하나 골라 문장을 만들어 보세요.</p>
        </div>
      </div>
      <div class="actions" style="margin-top:16px">
        <button class="btn secondary" id="prev">이전</button>
        <button class="btn mint" id="next">다음 개념</button>
        <button class="btn coral" id="final">마무리 테스트</button>
        <button class="btn secondary" id="dashboard">과목 선택</button>
      </div>
    </section>
  `, 72);
  document.querySelector("#prev").addEventListener("click", () => {
    state.studyIndex = Math.max(0, state.studyIndex - 1);
    render();
  });
  document.querySelector("#next").addEventListener("click", () => {
    state.studyIndex += 1;
    render();
  });
  document.querySelector("#final").addEventListener("click", startFinal);
  document.querySelector("#dashboard").addEventListener("click", () => {
    state.mode = "dashboard";
    render();
  });
}

function render() {
  if (state.mode === "home") renderHome();
  if (state.mode === "dashboard") renderDashboard();
  if (state.mode === "quiz" || state.mode === "final") renderQuestion();
  if (state.mode === "result") renderResult(false);
  if (state.mode === "finalResult") renderResult(true);
  if (state.mode === "study") renderStudy();
}

async function boot() {
  try {
    const response = await fetch("concepts_all.json");
    const raw = await response.json();
    const data = repairDeep(raw);
    state.concepts = data.concepts.map((item) => ({ ...item, subject: normalizeSubject(item.subject) }));
    state.mode = "home";
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="panel">
        <h1>데이터를 불러오지 못했어요.</h1>
        <p>로컬 서버로 실행하면 concepts_all.json을 읽을 수 있습니다.</p>
        <pre>${error.message}</pre>
      </section>
    `;
  }
}

boot();
