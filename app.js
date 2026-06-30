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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        renderTimer();
        saveState();
        clearInterval(timerId);
        submitQuiz(true);
        return;
      }
      renderTimer();
      saveState();
    }, 1000);
  }

  function observeVisibleQuestion() {
    const observer = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (active) {
        const index = Number(active.target.id.split("-")[1]) - 1;
        renderNavigator(index);
      }
    }, { threshold: [0.3, 0.6, 0.9] });

    document.querySelectorAll(".question-card").forEach((card) => observer.observe(card));
  }

  submitBtn.addEventListener("click", () => {
    const unanswered = answers.filter((value) => value === null).length;
    if (unanswered > 0) {
      const confirmed = confirm(`Masih ada ${unanswered} soal yang belum dijawab. Tetap submit sekarang?`);
      if (!confirmed) return;
    }
    submitQuiz(false);
  });

  resetBtn.addEventListener("click", resetQuiz);

  loadState();
  renderQuestions();
  syncChoiceStyles();
  updateOverview();
  renderNavigator();
  renderTimer();
  startTimer();
  observeVisibleQuestion();
  // ... kode observeVisibleQuestion() ...
  // submitBtn.addEventListener(...)
  // resetBtn.addEventListener(...)
  // loadState();
  // renderQuestions(); ... dst

  // --- TAMBAHKAN LOGIKA KALKULATOR DI BAWAH INI ---
  const calcBtn = document.getElementById("calcBtn");
  const formulaInput = document.getElementById("formulaInput");
  const calcResult = document.getElementById("calcResult");

  if (calcBtn && formulaInput) {
    // Data Ar sederhana untuk unsur umum
    const atomicWeights = {
      H: 1, C: 12, N: 14, O: 16, Na: 23, Mg: 24, 
      Al: 27, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56
    };

    calcBtn.addEventListener("click", () => {
      let formula = formulaInput.value.trim();
      if (!formula) return;

      try {
        // Regex sederhana untuk memecah unsur dan angkanya (contoh: H2O -> H2, O)
        const regex = /([A-Z][a-z]*)(\d*)/g;
        let match;
        let totalMr = 0;
        let valid = true;

        while ((match = regex.exec(formula)) !== null) {
          let element = match[1];
          let count = match[2] === "" ? 1 : parseInt(match[2]);
          
          if (atomicWeights[element]) {
            totalMr += atomicWeights[element] * count;
          } else {
            valid = false;
            calcResult.textContent = `Unsur ${element} belum didukung.`;
            calcResult.style.color = "var(--danger)";
            break;
          }
        }

        if (valid && totalMr > 0) {
          calcResult.textContent = `Mr = ${totalMr} g/mol`;
          calcResult.style.color = "var(--primary)";
        }
      } catch (e) {
        calcResult.textContent = "Format salah.";
      }
    });
  }
  // --- BATAS PENAMBAHAN KODE ---

} // <-- Ini adalah penutup if (dataNode) yang sudah ada di file Anda
}
