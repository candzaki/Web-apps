const dataNode = document.getElementById("quiz-data");

if (dataNode) {
  const quizData = JSON.parse(dataNode.textContent);
  const totalQuestions = quizData.length;
  const storageKey = window.QUIZ_STORAGE_KEY || "labkimia-quiz-session";
  const submitUrl = window.QUIZ_SUBMIT_URL || "/api/submit-quiz";
  const totalSeconds = (window.QUIZ_DURATION_MINUTES || 45) * 60;

  const questionList = document.getElementById("questionList");
  const navigatorGrid = document.getElementById("navigatorGrid");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const answeredText = document.getElementById("answeredText");
  const remainingText = document.getElementById("remainingText");
  const timerText = document.getElementById("timerText");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");

  let answers = Array(totalQuestions).fill(null);
  let remainingSeconds = totalSeconds;
  let timerId = null;
  let isSubmitting = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.answers) && parsed.answers.length === totalQuestions) {
        answers = parsed.answers.map((value) => Number.isInteger(value) ? value : null);
      }
      if (typeof parsed.remainingSeconds === "number" && parsed.remainingSeconds > 0) {
        remainingSeconds = parsed.remainingSeconds;
      }
    } catch (error) {
      console.warn("Gagal memuat state quiz:", error);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify({ answers, remainingSeconds }));
  }

  function optionLetter(index) {
    return String.fromCharCode(65 + index);
  }

  function renderQuestions() {
    questionList.innerHTML = quizData.map((item, index) => {
      const options = item.options.map((option, optionIndex) => `
        <label class="choice ${answers[index] === optionIndex ? "selected" : ""}">
          <input type="radio" name="question-${index}" value="${optionIndex}" ${answers[index] === optionIndex ? "checked" : ""}>
          <strong>${optionLetter(optionIndex)}</strong>
          <span>${option}</span>
        </label>
      `).join("");

      return `
        <article class="question-card" id="question-${index + 1}">
          <div class="question-top">
            <div class="question-index">${index + 1}</div>
            <div>
              <h3 class="question-title">${item.question}</h3>
              <div class="question-meta">
                <span class="meta-chip">${item.topic}</span>
                <span class="meta-chip">${item.difficulty}</span>
              </div>
            </div>
            <span class="meta-chip">Soal ${index + 1}</span>
          </div>
          <div class="choices">${options}</div>
        </article>
      `;
    }).join("");

    questionList.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        const questionIndex = Number(event.target.name.split("-")[1]);
        answers[questionIndex] = Number(event.target.value);
        saveState();
        syncChoiceStyles();
        updateOverview();
        renderNavigator();
      });
    });
  }

  function syncChoiceStyles() {
    document.querySelectorAll(".question-card").forEach((card, index) => {
      card.querySelectorAll(".choice").forEach((choice, optionIndex) => {
        choice.classList.toggle("selected", answers[index] === optionIndex);
      });
    });
  }

  function updateOverview() {
    const answered = answers.filter((value) => value !== null).length;
    const remaining = totalQuestions - answered;
    const percent = Math.round((answered / totalQuestions) * 100);

    progressText.textContent = `${answered} / ${totalQuestions}`;
    answeredText.textContent = answered;
    remainingText.textContent = remaining;
    progressBar.style.width = `${percent}%`;
  }

  function renderNavigator(activeIndex = null) {
    navigatorGrid.innerHTML = quizData.map((_, index) => {
      const answeredClass = answers[index] !== null ? "answered" : "";
      const activeClass = activeIndex === index ? "active" : "";
      return `<button class="nav-tile ${answeredClass} ${activeClass}" data-target="${index + 1}">${index + 1}</button>`;
    }).join("");

    navigatorGrid.querySelectorAll(".nav-tile").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById(`question-${button.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderTimer() {
    const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    timerText.textContent = `${minutes}:${seconds}`;
  }

  async function submitQuiz(autoSubmit = false) {
    if (isSubmitting) return;
    isSubmitting = true;
    clearInterval(timerId);

    submitBtn.textContent = autoSubmit ? "Mengirim otomatis..." : "Mengirim jawaban...";
    submitBtn.disabled = true;

    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          answers,
          duration_seconds: totalSeconds - remainingSeconds
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal mengirim jawaban.");
      }

      localStorage.removeItem(storageKey);
      window.location.href = result.redirect_url;
    } catch (error) {
      alert(error.message);
      submitBtn.textContent = "Submit jawaban";
      submitBtn.disabled = false;
      isSubmitting = false;
      startTimer();
    }
  }

  function resetQuiz() {
    const confirmed = confirm("Semua jawaban dan timer akan direset. Lanjutkan?");
    if (!confirmed) return;

    answers = Array(totalQuestions).fill(null);
    remainingSeconds = totalSeconds;
    localStorage.removeItem(storageKey);
    renderQuestions();
    syncChoiceStyles();
    updateOverview();
    renderNavigator();
    renderTimer();
    clearInterval(timerId);
    startTimer();
    window.
