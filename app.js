const app = document.querySelector("#app");

const DATA_FILES = [
  "grade3_korean_concepts_enhanced_part1.json",
  "grade3_korean_concepts_enhanced_part2.json",
  "grade3_korean_concepts_enhanced_part3.json",
  "grade3_korean_concepts_enhanced_part4.json",
  "grade3_social_concepts_enhanced_part1.json",
  "grade3_social_concepts_enhanced_part2.json",
  "grade3_social_concepts_enhanced_part3.json",
  "grade3_social_concepts_enhanced_part4.json",
  "grade3_science_concepts_enhanced_part1.json",
  "grade3_science_concepts_enhanced_part2.json",
  "grade3_science_concepts_enhanced_part3.json",
  "grade3_science_concepts_enhanced_part4.json",
  "grade4_korean_concepts_high_quality_part1.json",
  "grade4_korean_concepts_high_quality_part2.json",
  "grade4_korean_concepts_high_quality_part3.json",
  "grade4_korean_concepts_high_quality_part4.json",
  "grade4_social_concepts_high_quality_part1.json",
  "grade4_social_concepts_high_quality_part2.json",
  "grade4_social_concepts_high_quality_part3.json",
  "grade4_social_concepts_high_quality_part4.json",
  "grade4_science_concepts_high_v2_part1.json",
  "grade4_science_concepts_high_v2_part2.json",
  "grade4_science_concepts_high_v2_part3.json",
  "grade4_science_concepts_high_v2_part4.json",
  "grade5_korean_concepts_high_quality_part1A.json",
  "grade5_korean_concepts_high_quality_part1B.json",
  "grade5_korean_concepts_high_quality_part2A.json",
  "grade5_korean_concepts_high_quality_part2B.json",
  "grade5_korean_part3A_41_50_with_hanja.json",
  "grade5_korean_part3B_51_60_with_hanja.json",
  "grade5_korean_part4A_61_70_with_hanja.json",
  "grade5_korean_part4B_71_80_with_hanja.json",
  "grade5_social_concepts_part1.json",
  "grade5_social_concepts_part2.json",
  "grade5_social_concepts_part3.json",
  "grade5_social_concepts_part4.json",
  "grade5_science_concepts_part1.json",
  "grade5_science_concepts_part2.json",
  "grade5_science_concepts_part3.json",
  "grade5_science_concepts_part4.json",
  "grade6_korean_concepts_part1.json",
  "grade6_korean_concepts_part2.json",
  "grade6_korean_concepts_part3.json",
  "grade6_korean_concepts_part4.json",
  "grade6_social_concepts_high_part1.json",
  "grade6_social_concepts_high_part2.json",
  "grade6_social_concepts_high_part3.json",
  "grade6_social_concepts_high_part4.json",
  "grade6_science_concepts_high_part1.json",
  "grade6_science_concepts_high_part2.json",
  "grade6_science_concepts_high_part3.json",
  "grade6_science_concepts_high_part4.json",
];

const SUBJECTS = [
  { subject: "국어", accent: "mint", image: "assets/subject-korean.svg" },
  { subject: "사회", accent: "coral", image: "assets/subject-social.svg" },
  { subject: "과학", accent: "blue", image: "assets/subject-science.svg" },
];

const state = {
  concepts: [],
  grade: 3,
  subject: "국어",
  mode: "home",
  studyStage: 0,
  studyIndex: 0,
  testKind: "pretest",
  quiz: [],
  current: 0,
  answers: [],
  missed: [],
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getFileMeta(fileName, data) {
  const grade = Number(data.grade || fileName.match(/grade(\d)/)?.[1]);
  const lower = fileName.toLowerCase();
  const subject = lower.includes("korean") ? "국어" : lower.includes("social") ? "사회" : "과학";
  const filePart = fileName.match(/part(\d+)/i)?.[1];
  const dataPart = String(data.part || "").match(/\d+/)?.[0];
  return { grade, subject, part: Number(filePart || dataPart || 1) };
}

function formatHanja(hanja, item) {
  if (!hanja) return "";
  if (typeof hanja === "string") {
    return item.hanja_meaning ? `${hanja} (${item.hanja_meaning})` : hanja;
  }
  if (typeof hanja === "object") {
    return `${hanja.word || ""} ${hanja.breakdown || ""}`.trim();
  }
  return "";
}

function formatBreakdown(item) {
  return toArray(item.hanja_breakdown)
    .map((part) => `${part.hanja}: ${part.meaning}`)
    .join(" · ");
}

function normalizeConcept(item, meta, index) {
  const term = item.term || item.concept || "";
  const definition = item.description || item.meaning || item.definition || "";
  const easy = item.easy_explanation || item.easy_definition || item.student_friendly_explanation || "";
  const examples = [...toArray(item.examples), item.example_sentence, item.example].filter(Boolean);
  const related = [
    ...toArray(item.related_words),
    ...toArray(item.related_terms),
    ...toArray(item.related_concepts),
    ...toArray(item.keywords),
  ].filter((word) => word && word !== term);

  return {
    id: `${meta.grade}-${meta.subject}-${meta.part}-${item.id || index + 1}`,
    grade: Number(item.grade || meta.grade),
    subject: meta.subject,
    part: meta.part,
    unit: item.unit || item.category || `PART ${meta.part}`,
    term,
    definition,
    easy,
    hanja: formatHanja(item.hanja, item),
    hanjaBreakdown: formatBreakdown(item),
    examples,
    synonyms: toArray(item.synonyms),
    antonyms: toArray(item.antonyms),
    related: [...new Set(related)].slice(0, 8),
    proverb: item.proverb || "",
    tip: item.learning_tip || item.misconception_tip || item.non_example || "",
  };
}

async function loadConcepts() {
  const loaded = await Promise.all(DATA_FILES.map(async (fileName) => {
    const response = await fetch(fileName);
    if (!response.ok) throw new Error(`${fileName} 파일을 읽지 못했습니다.`);
    const data = await response.json();
    const meta = getFileMeta(fileName, data);
    return (data.concepts || data).map((item, index) => normalizeConcept(item, meta, index));
  }));
  state.concepts = loaded.flat().filter((item) => item.term && item.definition);
}

function getPool() {
  return state.concepts
    .filter((item) => item.grade === Number(state.grade) && item.subject === state.subject)
    .sort((a, b) => a.part - b.part || String(a.id).localeCompare(String(b.id), "ko"));
}

function getStages() {
  const pool = getPool();
  return Array.from({ length: Math.ceil(pool.length / 20) }, (_, index) => pool.slice(index * 20, index * 20 + 20));
}

function currentStageItems() {
  return getStages()[state.studyStage] || [];
}

function makeWrongDefinition(concept, source) {
  return shuffle(source.filter((item) => item.id !== concept.id && item.definition))[0]?.definition || "서로 관계없는 내용을 모은 것";
}

function makeOxQuestion(concept, index, source) {
  const isCorrect = index % 3 !== 0;
  return {
    ...concept,
    type: "ox",
    quizQuestion: isCorrect
      ? `"${concept.term}"의 뜻은 "${concept.definition}"이다.`
      : `"${concept.term}"의 뜻은 "${makeWrongDefinition(concept, source)}"이다.`,
    quizAnswer: isCorrect,
  };
}

function makeChoiceQuestion(concept, source) {
  const wrongChoices = shuffle(source.filter((item) => item.id !== concept.id)).slice(0, 3);
  const choices = shuffle([concept, ...wrongChoices]).map((item, index) => ({
    id: item.id,
    label: `${index + 1}. ${item.term}`,
  }));
  return {
    ...concept,
    type: "choice",
    quizQuestion: `다음 뜻에 알맞은 개념어를 고르세요.\n"${concept.definition}"`,
    choices,
    quizAnswer: concept.id,
  };
}

function startTest(kind) {
  const source = getPool();
  const selected = shuffle(source).slice(0, 20);
  const oxQuestions = selected.slice(0, 10).map((concept, index) => makeOxQuestion(concept, index, source));
  const choiceQuestions = selected.slice(10, 20).map((concept) => makeChoiceQuestion(concept, source));
  state.testKind = kind;
  state.quiz = shuffle([...oxQuestions, ...choiceQuestions]);
  state.current = 0;
  state.answers = [];
  state.missed = [];
  state.mode = "test";
  render();
}

function answerTest(answer) {
  const current = state.quiz[state.current];
  const correct = answer === current.quizAnswer;
  state.answers.push({ id: current.id, correct });
  if (!correct) state.missed.push(current);
  renderTestFeedback(correct, current);
}

function nextTestQuestion() {
  if (state.current < state.quiz.length - 1) {
    state.current += 1;
    render();
    return;
  }
  state.mode = "testResult";
  render();
}

function testFeedback(score, kind) {
  if (kind === "final") {
    if (score >= 16) return { title: "개념 정리 성공", text: "80개 개념 중 핵심 뜻을 잘 잡았습니다. 헷갈린 개념만 가볍게 복습하면 충분해요." };
    if (score >= 10) return { title: "복습하면 더 탄탄해져요", text: "알고 있는 개념이 많지만 몇 개는 흔들렸어요. 틀린 개념의 예시 문장을 다시 읽어 보세요." };
    return { title: "다시 학습하면 좋아요", text: "아직 익숙하지 않은 개념이 많아요. 단계 학습으로 돌아가 뜻과 예시를 천천히 확인해 봐요." };
  }
  if (score >= 16) return {
    title: "열매 단계",
    icon: "🍎",
    className: "stage-fruit",
    text: "개념이 알차게 익어가고 있어요. 학습 카드에서 한자어와 관련어까지 확인하면 더 단단한 열매가 됩니다.",
    cheer: "멋져요! 지금 감각 그대로 마지막까지 자신 있게 가 봐요.",
  };
  if (score >= 7) return {
    title: "꽃 단계",
    icon: "🌸",
    className: "stage-flower",
    text: "알고 있는 개념이 꽃처럼 피어나고 있어요. 헷갈린 개념은 예시 문장을 읽으며 다시 잡아 봐요.",
    cheer: "충분히 잘하고 있어요. 조금만 더 다듬으면 활짝 피겠습니다.",
  };
  return {
    title: "새싹 단계",
    icon: "🌱",
    className: "stage-sprout",
    text: "처음 만나는 개념이 많아 보여요. 뜻과 예시 문장을 천천히 읽으면 새싹처럼 금방 자랄 수 있어요.",
    cheer: "괜찮아요. 지금부터 하나씩 익히면 됩니다!",
  };
}

function setMode(mode) {
  state.mode = mode;
  render();
}

function startStudy(stage = 0) {
  state.studyStage = stage;
  state.studyIndex = 0;
  setMode("study");
}

function stagePraise(stage) {
  const messages = [
    {
      icon: "🌱",
      title: "1단계 완료",
      text: "첫 단계의 개념을 차근차근 살펴봤어요. 새싹처럼 이해가 자라기 시작했습니다.",
      cheer: "좋은 시작이에요. 다음 단계에서도 지금처럼 천천히 읽어 봐요!",
      className: "stage-sprout",
    },
    {
      icon: "🌸",
      title: "2단계 완료",
      text: "개념들이 하나씩 꽃처럼 피어나고 있어요. 뜻과 예시를 연결하는 힘이 좋아졌습니다.",
      cheer: "아주 잘하고 있어요. 헷갈리는 말도 다시 보면 금방 잡힙니다!",
      className: "stage-flower",
    },
    {
      icon: "🌿",
      title: "3단계 완료",
      text: "이제 꽤 많은 개념을 지나왔어요. 관련어까지 보는 힘이 단단해지고 있습니다.",
      cheer: "조금만 더 가면 80개 완주예요. 멋지게 이어 가 봐요!",
      className: "stage-sprout",
    },
    {
      icon: "🍎",
      title: "4단계 완료",
      text: "마지막 단계까지 해냈어요. 개념 열매가 알차게 익었습니다.",
      cheer: "정말 잘했어요. 이제 마지막 확인 테스트로 실력을 확인해 봐요!",
      className: "stage-fruit",
    },
  ];
  return messages[stage] || messages[0];
}

function renderShell(content) {
  app.innerHTML = `
    <header class="topbar">
      <div class="page-context">${state.grade}학년 · ${state.subject}</div>
      <button class="home-button" id="topHome" type="button" aria-label="처음 화면으로" title="처음 화면으로">🏠</button>
    </header>
    ${content}
  `;
  document.querySelector("#topHome").addEventListener("click", () => setMode("home"));
}

function renderHome() {
  app.innerHTML = `
    <section class="home-screen">
      <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="home-inner">
        <p class="home-kicker">국어 · 사회 · 과학</p>
        <h1><span>초등 개념어</span><br />단계별 학습</h1>
        <p class="home-subtitle">개념어를 뜻, 예시 문장, 한자어, 비슷한말까지<br /><span>20개씩 차근차근</span> 익혀요.</p>
        <div class="home-guide"><span>학년</span>을 먼저 골라 주세요</div>
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
      state.grade = Number(button.dataset.grade);
      setMode("subjectSelect");
    });
  });
}

function renderSubjectSelect() {
  app.innerHTML = `
    <section class="home-screen subject-screen">
      <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="home-inner">
        <div class="subject-title-box">
          <h1><span>${state.grade}학년</span><br />과목을 선택해 주세요</h1>
        </div>
        <div class="subject-grid" aria-label="과목 선택">
          ${SUBJECTS.map(({ subject, accent, image }) => `
            <button class="grade-card subject-card ${accent}" data-subject="${subject}" type="button">
              <img class="subject-image" src="${image}" alt="" aria-hidden="true" />
              <strong>${subject}</strong>
            </button>
          `).join("")}
        </div>
        <button class="btn secondary subject-back" id="backToGrades" type="button">학년 다시 선택</button>
      </div>
    </section>
  `;
  document.querySelectorAll(".subject-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.subject = button.dataset.subject;
      state.studyStage = 0;
      state.studyIndex = 0;
      setMode("dashboard");
    });
  });
  document.querySelector("#backToGrades").addEventListener("click", () => setMode("home"));
}

function renderDashboard() {
  const pool = getPool();
  renderShell(`
    <section class="panel choice-panel">
      <h2>${state.grade}학년 ${state.subject} 시작하기</h2>
      <p>총 ${pool.length}개 개념어가 준비되어 있습니다. 먼저 예비 테스트를 볼 수도 있고, 바로 학습을 시작할 수도 있어요.</p>
      <div class="learning-choice-grid">
        <button class="grade-card learning-choice-card mint" id="pretest" type="button">
          <img class="learning-choice-image" src="assets/action-test.svg" alt="" aria-hidden="true" />
          <strong>예비 테스트</strong>
          <span>80개 중 20문항</span>
        </button>
        <button class="grade-card learning-choice-card blue" id="study" type="button">
          <img class="learning-choice-image" src="assets/action-study.svg" alt="" aria-hidden="true" />
          <strong>바로 학습</strong>
          <span>1단계부터 시작</span>
        </button>
      </div>
    </section>
  `);
  document.querySelector("#pretest").addEventListener("click", () => startTest("pretest"));
  document.querySelector("#study").addEventListener("click", () => startStudy(0));
}

function renderAnswerButtons(current) {
  if (current.type === "choice") {
    return `
      <div class="answer-grid choice-answer-grid">
        ${current.choices.map((choice) => `
          <button class="answer" data-answer="${escapeHtml(choice.id)}" type="button">${escapeHtml(choice.label)}</button>
        `).join("")}
      </div>
    `;
  }
  return `
    <div class="answer-grid">
      <button class="answer" data-answer="true" type="button">O 맞아요</button>
      <button class="answer" data-answer="false" type="button">X 아니에요</button>
    </div>
  `;
}

function renderTest() {
  const current = state.quiz[state.current];
  const title = state.testKind === "final" ? "마지막 확인 테스트" : "예비 테스트";
  renderShell(`
    <section class="question">
      <div class="meta">${title} · ${state.current + 1}/${state.quiz.length}</div>
      <div class="chips">
        <span class="chip">${escapeHtml(current.unit)}</span>
        <span class="chip">${current.type === "ox" ? "OX" : "객관식"}</span>
      </div>
      <h2>${escapeHtml(current.quizQuestion)}</h2>
      ${renderAnswerButtons(current)}
      <div id="feedback"></div>
    </section>
  `);
  document.querySelectorAll(".answer").forEach((button) => {
    const answer = current.type === "choice" ? button.dataset.answer : button.dataset.answer === "true";
    button.addEventListener("click", () => answerTest(answer));
  });
}

function renderTestFeedback(correct, current) {
  document.querySelectorAll(".answer").forEach((button) => {
    button.disabled = true;
    const answer = current.type === "choice" ? button.dataset.answer : button.dataset.answer === "true";
    if (answer === current.quizAnswer) button.classList.add("selected");
  });
  document.querySelector("#feedback").innerHTML = `
    <div class="feedback ${correct ? "good" : "bad"}">
      ${correct ? "정답이에요!" : "아쉬워요. 정답을 확인해 봐요."}
      <div class="result-line">${escapeHtml(current.term)}: ${escapeHtml(current.definition)}</div>
    </div>
    <div class="actions study-actions">
      <button class="btn mint" id="nextQuestion" type="button">다음</button>
    </div>
  `;
  document.querySelector("#nextQuestion").addEventListener("click", nextTestQuestion);
}

function renderTestResult() {
  const score = state.answers.filter((item) => item.correct).length;
  const feedback = testFeedback(score, state.testKind);
  const isFinal = state.testKind === "final";
  renderShell(`
    <section class="result-window ${feedback.className || "stage-sprout"}">
      <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="result-window-body">
        ${feedback.icon ? `<div class="stage-icon" aria-hidden="true">${feedback.icon}</div>` : ""}
        <h2>${isFinal ? "마지막 확인 테스트 결과" : "예비 테스트 결과"}</h2>
        <div class="score-line"><strong>${score}</strong><span>/${state.quiz.length}개 정답</span></div>
        <div class="stage-badge">${feedback.title}</div>
        <p>${feedback.text}</p>
        ${feedback.cheer ? `<p class="cheer-line">${feedback.cheer}</p>` : ""}
        <div class="actions result-actions">
          ${isFinal
            ? `<button class="btn mint" id="reviewStudy" type="button">다시 학습</button>`
            : `<button class="btn mint" id="startStudy" type="button">학습 시작</button>`}
          <button class="btn secondary" id="retryTest" type="button">테스트 다시</button>
          <button class="btn secondary" id="dashboard" type="button">처음 선택</button>
        </div>
      </div>
    </section>
    ${state.missed.length ? `
      <section class="panel">
        <h2>먼저 보면 좋은 개념</h2>
        <div class="review-list">
          ${state.missed.slice(0, 6).map((item) => `
            <div class="review-item"><strong>${escapeHtml(item.term)}</strong><div>${escapeHtml(item.definition)}</div></div>
          `).join("")}
        </div>
      </section>
    ` : ""}
  `);
  if (isFinal) {
    document.querySelector("#reviewStudy").addEventListener("click", () => startStudy(0));
  } else {
    document.querySelector("#startStudy").addEventListener("click", () => startStudy(0));
  }
  document.querySelector("#retryTest").addEventListener("click", () => startTest(state.testKind));
  document.querySelector("#dashboard").addEventListener("click", () => setMode("dashboard"));
}

function renderList(label, values) {
  if (!values.length) return "";
  return `
    <div class="note-row">
      <span class="note-label">${label}</span>
      <p>${values.map(escapeHtml).join(", ")}</p>
    </div>
  `;
}

function renderStudy() {
  const stages = getStages();
  const stageItems = currentStageItems();
  const current = stageItems[state.studyIndex];
  if (!current) {
    renderDashboard();
    return;
  }
  renderShell(`
    <section class="panel study-note-panel">
      <div class="study-header">
        <div>
          <h2>${state.studyStage + 1}단계 개념어 학습</h2>
          <p>${state.studyIndex + 1}/${stageItems.length} · ${escapeHtml(current.unit)}</p>
        </div>
        <div class="stage-tabs" aria-label="단계 이동">
          ${Array.from({ length: 4 }, (_, index) => `
            <button class="stage-tab ${index === state.studyStage ? "active" : ""}" data-stage="${index}" ${stages[index]?.length ? "" : "disabled"} type="button">
              ${index + 1}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="concept-note">
        <aside class="concept-word-card">
          <div class="term">${escapeHtml(current.term)}</div>
          ${current.hanja ? `<div class="hanja-line">${escapeHtml(current.hanja)}</div>` : ""}
          ${current.hanjaBreakdown ? `<p>${escapeHtml(current.hanjaBreakdown)}</p>` : ""}
        </aside>
        <div class="concept-detail-card">
          <div class="note-row">
            <span class="note-label">뜻</span>
            <p>${escapeHtml(current.definition)}</p>
          </div>
          ${current.easy ? `
            <div class="note-row">
              <span class="note-label">쉽게</span>
              <p>${escapeHtml(current.easy)}</p>
            </div>
          ` : ""}
          ${current.examples.length ? `
            <div class="note-row">
              <span class="note-label">예</span>
              <p>${current.examples.slice(0, 2).map((example) => escapeHtml(example)).join("<br />")}</p>
            </div>
          ` : ""}
          ${renderList("비슷한말", current.synonyms)}
          ${renderList("반대말", current.antonyms)}
          ${renderList("관련어", current.related)}
          ${current.proverb ? `
            <div class="note-row">
              <span class="note-label">속담</span>
              <p>${escapeHtml(current.proverb)}</p>
            </div>
          ` : ""}
          ${current.tip ? `
            <div class="note-row">
              <span class="note-label">주의</span>
              <p>${escapeHtml(current.tip)}</p>
            </div>
          ` : ""}
        </div>
      </div>
      <div class="actions study-actions">
        <button class="btn secondary" id="prevConcept" ${state.studyIndex === 0 ? "disabled" : ""} type="button">이전</button>
        <button class="btn mint" id="nextConcept" type="button">${state.studyIndex === stageItems.length - 1 ? "단계 완료" : "다음 개념"}</button>
        <button class="btn secondary" id="dashboard" type="button">처음 선택</button>
      </div>
    </section>
  `);
  document.querySelectorAll(".stage-tab").forEach((button) => {
    button.addEventListener("click", () => startStudy(Number(button.dataset.stage)));
  });
  document.querySelector("#prevConcept").addEventListener("click", () => {
    state.studyIndex = Math.max(0, state.studyIndex - 1);
    render();
  });
  document.querySelector("#nextConcept").addEventListener("click", () => {
    if (state.studyIndex < stageItems.length - 1) {
      state.studyIndex += 1;
      render();
      return;
    }
    setMode("stageComplete");
  });
  document.querySelector("#dashboard").addEventListener("click", () => setMode("dashboard"));
}

function renderStageComplete() {
  const stages = getStages();
  const praise = stagePraise(state.studyStage);
  const hasNext = Boolean(stages[state.studyStage + 1]?.length);
  renderShell(`
    <section class="result-window ${praise.className}">
      <div class="window-bar" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="result-window-body">
        <div class="stage-icon" aria-hidden="true">${praise.icon}</div>
        <h2>${praise.title}</h2>
        <div class="stage-badge">잘하고 있어요!</div>
        <p>${praise.text}</p>
        <p class="cheer-line">${praise.cheer}</p>
        <div class="actions result-actions">
          ${hasNext
            ? `<button class="btn mint" id="nextStage" type="button">${state.studyStage + 2}단계로 가기</button>`
            : `<button class="btn mint" id="finalTest" type="button">마지막 확인 테스트</button>`}
          <button class="btn secondary" id="reviewStage" type="button">이번 단계 다시 보기</button>
          <button class="btn secondary" id="dashboard" type="button">처음 선택</button>
        </div>
      </div>
    </section>
  `);
  if (hasNext) {
    document.querySelector("#nextStage").addEventListener("click", () => startStudy(state.studyStage + 1));
  } else {
    document.querySelector("#finalTest").addEventListener("click", () => startTest("final"));
  }
  document.querySelector("#reviewStage").addEventListener("click", () => startStudy(state.studyStage));
  document.querySelector("#dashboard").addEventListener("click", () => setMode("dashboard"));
}

function renderComplete() {
  renderShell(`
    <section class="panel choice-panel">
      <h2>${state.grade}학년 ${state.subject} 학습 완료</h2>
      <p>80개 개념어를 모두 학습했습니다. 이제 전체 개념어 중 20문항을 뽑아 마지막 확인 테스트를 볼 수 있어요.</p>
      <div class="actions result-actions">
        <button class="btn mint" id="finalTest" type="button">마지막 확인 테스트</button>
        <button class="btn secondary" id="restart" type="button">1단계부터 복습</button>
        <button class="btn secondary" id="dashboard" type="button">처음 선택</button>
      </div>
    </section>
  `);
  document.querySelector("#finalTest").addEventListener("click", () => startTest("final"));
  document.querySelector("#restart").addEventListener("click", () => startStudy(0));
  document.querySelector("#dashboard").addEventListener("click", () => setMode("dashboard"));
}

function render() {
  if (state.mode === "home") renderHome();
  if (state.mode === "subjectSelect") renderSubjectSelect();
  if (state.mode === "dashboard") renderDashboard();
  if (state.mode === "test") renderTest();
  if (state.mode === "testResult") renderTestResult();
  if (state.mode === "study") renderStudy();
  if (state.mode === "stageComplete") renderStageComplete();
}

async function boot() {
  try {
    await loadConcepts();
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="panel">
        <h1>데이터를 불러오지 못했습니다.</h1>
        <p>로컬 서버로 실행한 뒤 다시 열어 주세요.</p>
        <pre>${escapeHtml(error.message)}</pre>
      </section>
    `;
  }
}

boot();
