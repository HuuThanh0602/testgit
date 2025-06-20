document.addEventListener('DOMContentLoaded', () => {
  let questions = [];
  let currentQuestionIndex = 0;
  let userAnswers = JSON.parse(localStorage.getItem('quizAnswers')) || {};
  let checkedStatuses = JSON.parse(localStorage.getItem('checkedStatuses')) || {};

  const questionElement = document.getElementById('question');
  const optionsElement = document.getElementById('options');
  const explanationElement = document.getElementById('explanation');
  const prevBtn = document.getElementById('prev-btn');
  const checkBtn = document.getElementById('check-btn');
  const nextBtn = document.getElementById('next-btn');
  const quizContainer = document.getElementById('quiz-container');
  const resultContainer = document.getElementById('result-container');
  const resultElement = document.getElementById('result');
  const resetBtn = document.getElementById('reset-btn');
  const restartBtn = document.getElementById('restart-btn');
  const chapterSelect = document.getElementById('chapter-select');
  const loadChapterBtn = document.getElementById('load-chapter-btn');
  const miniMap = document.getElementById('mini-map');

  console.log('Reset button:', resetBtn); // Debug

  // Hàm xáo trộn mảng (Fisher-Yates shuffle)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Hàm tải câu hỏi từ file JSON dựa trên chương
  function loadQuestions(chapter) {
    const fileName = `questions/chapter${chapter}.json`;
    fetch(fileName)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Không thể tải file ${fileName}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Danh sách câu hỏi không hợp lệ hoặc trống');
        }
        // Chỉ sao chép mảng câu hỏi, không xáo trộn tại đây
        questions = [...data];
        currentQuestionIndex = 0;
        // Giữ nguyên userAnswers và checkedStatuses khi tải chương mới
        renderMiniMap();
        loadQuestion(currentQuestionIndex);
      })
      .catch(error => {
        console.error('Lỗi khi tải câu hỏi:', error);
        questionElement.textContent = 'Lỗi: Không thể tải câu hỏi. Vui lòng kiểm tra file JSON hoặc chạy trên server cục bộ.';
        optionsElement.innerHTML = '';
      });
  }

  // Hàm hiển thị câu hỏi
  function loadQuestion(index) {
    if (index < 0 || index >= questions.length || !questions[index]) {
      console.error('Chỉ số câu hỏi không hợp lệ hoặc câu hỏi không tồn tại:', index);
      return;
    }

    currentQuestionIndex = index;
    const question = questions[index];
    questionElement.innerHTML = `Câu ${index + 1}: ${question.question || 'Câu hỏi không có nội dung'}`;
    optionsElement.innerHTML = '';
    const isChecked = checkedStatuses[index] || false;

    if (!question.options) {
      console.error('Không có lựa chọn cho câu hỏi:', index);
      return;
    }

    // Sao chép và xáo trộn mảng options
    const shuffledOptions = shuffleArray([...question.options]);
    const optionIndexMap = {};
    question.options.forEach((opt, i) => {
      const newIndex = shuffledOptions.indexOf(opt);
      optionIndexMap[newIndex] = i;
    });

    shuffledOptions.forEach((option, i) => {
      const div = document.createElement('div');
      div.className = 'flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-200';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `option-${i}`;
      input.className = 'mr-2';
      const originalIndex = optionIndexMap[i];
      input.checked = userAnswers[index]?.includes(originalIndex) || false;
      if (isChecked) {
        input.disabled = true;
      } else {
        input.addEventListener('change', () => saveAnswer(index, i, originalIndex));
      }
      const label = document.createElement('label');
      label.htmlFor = `option-${i}`;
      label.textContent = option;
      label.className = 'text-gray-800 flex-1 cursor-pointer';
      label.addEventListener('click', (e) => {
        if (!isChecked) {
          e.preventDefault();
          input.checked = !input.checked;
          saveAnswer(index, i, originalIndex);
        }
      });
      div.appendChild(input);
      div.appendChild(label);
      optionsElement.appendChild(div);
    });

    if (isChecked && userAnswers[index]) {
      checkAnswer(index, false);
    } else {
      explanationElement.classList.add('hidden');
    }

    prevBtn.disabled = index === 0;
    const nextBtnText = nextBtn.querySelector('.text');
    nextBtnText.textContent = index === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp';
    nextBtn.disabled = index === questions.length - 1 && !userAnswers[index];
    updateMiniMap();
  }

  function saveAnswer(questionIndex, optionIndex, originalIndex) {
    if (!userAnswers[questionIndex]) {
      userAnswers[questionIndex] = [];
    }
    if (userAnswers[questionIndex].includes(originalIndex)) {
      userAnswers[questionIndex] = userAnswers[questionIndex].filter(i => i !== originalIndex);
    } else {
      userAnswers[questionIndex].push(originalIndex);
    }
    localStorage.setItem('quizAnswers', JSON.stringify(userAnswers));
    nextBtn.disabled = currentQuestionIndex === questions.length - 1 && !userAnswers[currentQuestionIndex];
  }

  function checkAnswer(index, reload = true) {
    const question = questions[index];
    const userAnswer = userAnswers[index] || [];
    const isCorrect = userAnswer.sort().join() === question.answer.sort().join();
    explanationElement.textContent = `Giải thích: ${question.explanation || 'Không có giải thích'} (${isCorrect ? 'Đúng' : 'Sai'})`;
    explanationElement.classList.remove('hidden');
    explanationElement.classList.toggle('text-green-600', isCorrect);
    explanationElement.classList.toggle('text-red-600', !isCorrect);
    checkedStatuses[index] = true;
    localStorage.setItem('checkedStatuses', JSON.stringify(checkedStatuses));
    if (reload) {
      loadQuestion(index);
    }
    updateMiniMap();
  }

  function showResult() {
    quizContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    let score = 0;

    questions.forEach((question, i) => {
      const userAnswer = userAnswers[i] || [];
      const isCorrect = userAnswer.sort().join() === question.answer.sort().join();
      if (isCorrect) {
        score++;
      }
    });

    resultElement.innerHTML = `<h2 class="text-2xl font-bold text-green-600 mb-4">Kết quả</h2><p class="text-lg font-bold">Bạn đúng ${score}/${questions.length} câu!</p>`;
    updateMiniMap();
  }

  // Hàm tạo mini map
  function renderMiniMap() {
    miniMap.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
      const btn = document.createElement('div');
      btn.className = 'mini-map-btn';
      btn.textContent = i + 1;
      btn.addEventListener('click', () => loadQuestion(i));
      miniMap.appendChild(btn);
    }
    updateMiniMap();
  }

  // Hàm cập nhật trạng thái mini map
  function updateMiniMap() {
    if (!questions.length) return;

    for (let i = 0; i < questions.length; i++) {
      const btn = miniMap.children[i];
      if (checkedStatuses[i]) {
        const userAnswer = userAnswers[i] || [];
        const isCorrect = userAnswer.sort().join() === questions[i].answer.sort().join();
        btn.className = 'mini-map-btn ' + (isCorrect ? 'correct' : 'incorrect');
      } else {
        btn.className = 'mini-map-btn';
      }
    }
  }

  prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadQuestion(currentQuestionIndex);
    }
  });

  checkBtn.addEventListener('click', () => {
    if (userAnswers[currentQuestionIndex]) {
      checkAnswer(currentQuestionIndex);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      loadQuestion(currentQuestionIndex);
    } else {
      showResult();
    }
  });

  restartBtn.addEventListener('click', () => {
    userAnswers = {};
    checkedStatuses = {};
    localStorage.removeItem('quizAnswers');
    localStorage.removeItem('checkedStatuses');
    currentQuestionIndex = 0;
    quizContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    loadQuestion(currentQuestionIndex); // Tải lại câu hỏi, giữ nguyên thứ tự
  });

  resetBtn.addEventListener('click', () => {
    console.log('Reset button clicked');
    localStorage.clear();
    userAnswers = {};
    checkedStatuses = {};
    currentQuestionIndex = 0;
    questions = shuffleArray([...questions]); // Trộn lại câu hỏi khi reset
    renderMiniMap();
    loadQuestion(currentQuestionIndex); // Tải lại câu hỏi sau khi trộn
  });

  // Sự kiện chọn và tải chương
  loadChapterBtn.addEventListener('click', () => {
    const chapter = chapterSelect.value;
    // Reset bộ nhớ câu trả lời khi tải chương mới
    userAnswers = {};
    checkedStatuses = {};
    localStorage.removeItem('quizAnswers');
    localStorage.removeItem('checkedStatuses');
    loadQuestions(chapter);
  });

  // Tải chương mặc định khi trang mở
  loadQuestions(1); // Mặc định tải chương 1
});