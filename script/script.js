// --- DOM ELEMENTS ---
const dropdowns = document.querySelectorAll(".dropdown-container"),
  inputLanguageDropdown = document.querySelector("#input-language"),
  outputLanguageDropdown = document.querySelector("#output-language"),
  inputLanguage = inputLanguageDropdown.querySelector(".selected"),
  outputLanguage = outputLanguageDropdown.querySelector(".selected"),
  inputTextElem = document.querySelector("#input-text"),
  outputTextElem = document.querySelector("#output-text"),
  swapBtn = document.querySelector(".swap-position"),
  uploadDocument = document.querySelector("#upload-document"),
  uploadTitle = document.querySelector("#upload-title"),
  downloadBtn = document.querySelector("#download-btn"),
  darkModeCheckbox = document.getElementById("dark-mode-btn"),
  inputChars = document.querySelector("#input-chars");

// --- DEBOUNCE UTILITY ---
/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
function debounce(func, wait = 500) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// --- TRANSLATION ---
/**
 * Fetches translation from the API and updates the output text area.
 */
function translate() {
  const inputText = inputTextElem.value.trim();
  const fromLang = inputLanguage.dataset.value;
  const toLang = outputLanguage.dataset.value;

  if (!inputText) {
    outputTextElem.value = "";
    return;
  }

  outputTextElem.value = "Translating...";

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURI(
    inputText
  )}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((json) => {
      const translatedText = json[0]?.map((item) => item[0]).join("") || "";
      outputTextElem.value = translatedText;
    })
    .catch((error) => {
      console.error("Translation Error:", error);
      outputTextElem.value = "Error: Could not translate.";
    });
}

// Create a debounced version for text input to avoid excessive API calls
const debouncedTranslate = debounce(translate, 500);

// --- DROPDOWN LOGIC ---
/**
 * Populates a dropdown menu with language options.
 * @param {HTMLElement} dropdown The dropdown container element.
 * @param {Array<Object>} options The array of language objects.
 */
function populateDropdown(dropdown, options) {
  const ul = dropdown.querySelector("ul");
  ul.innerHTML = "";
  options.forEach((option) => {
    const li = document.createElement("li");
    li.innerHTML = `${option.name} (${option.native})`;
    li.dataset.value = option.code;
    li.classList.add("option");
    if (
      (dropdown.id === "output-language" && option.code === "en") ||
      (dropdown.id === "input-language" && option.code === "auto")
    ) {
      li.classList.add("active");
    }
    ul.appendChild(li);
  });
}

populateDropdown(inputLanguageDropdown, languages);
populateDropdown(outputLanguageDropdown, languages);

// Handle dropdown interactions
dropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  const menu = dropdown.querySelector(".dropdown-menu");

  toggle.addEventListener("click", () => {
    const isActive = dropdown.classList.toggle("active");
    toggle.setAttribute("aria-expanded", isActive);
  });

  menu.addEventListener("click", (e) => {
    if (e.target.classList.contains("option")) {
      const selected = dropdown.querySelector(".selected");
      menu.querySelector(".option.active")?.classList.remove("active");
      e.target.classList.add("active");
      selected.innerHTML = e.target.innerHTML;
      selected.dataset.value = e.target.dataset.value;
      dropdown.classList.remove("active");
      toggle.setAttribute("aria-expanded", "false");
      translate(); // Translate immediately on language change
    }
  });
});

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      dropdown.querySelector(".dropdown-toggle").setAttribute("aria-expanded", "false");
    }
  });
});

// --- EVENT LISTENERS ---

// Swap languages and text
swapBtn.addEventListener("click", () => {
  if (inputLanguage.dataset.value === "auto") return;

  [inputLanguage.innerHTML, outputLanguage.innerHTML] = [outputLanguage.innerHTML, inputLanguage.innerHTML];
  [inputLanguage.dataset.value, outputLanguage.dataset.value] = [outputLanguage.dataset.value, inputLanguage.dataset.value];
  [inputTextElem.value, outputTextElem.value] = [outputTextElem.value, inputTextElem.value];

  // Update active class in dropdown menus
  inputLanguageDropdown.querySelector(".option.active")?.classList.remove("active");
  outputLanguageDropdown.querySelector(".option.active")?.classList.remove("active");
  inputLanguageDropdown.querySelector(`li[data-value="${inputLanguage.dataset.value}"]`)?.classList.add("active");
  outputLanguageDropdown.querySelector(`li[data-value="${outputLanguage.dataset.value}"]`)?.classList.add("active");

  translate();
});

// Handle text input, character count, and debounced translation
inputTextElem.addEventListener("input", () => {
  const textLength = inputTextElem.value.length;
  inputChars.innerHTML = textLength;

  if (textLength > 5000) {
    inputTextElem.value = inputTextElem.value.slice(0, 5000);
    inputChars.innerHTML = "5000";
  }

  debouncedTranslate();
});

// Handle document upload
uploadDocument.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Only allow plain text files for reliable client-side reading
  const allowedFileTypes = ["text/plain"];

  if (allowedFileTypes.includes(file.type)) {
    uploadTitle.innerHTML = file.name;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (event) => {
      inputTextElem.value = event.target.result;
      inputChars.innerHTML = inputTextElem.value.length;
      translate();
    };
    reader.onerror = () => {
      console.error("Error reading file.");
      alert("Error reading file. Please ensure it is a valid text file.");
    };
  } else {
    alert("Please upload a valid .txt file.");
  }
});

// Handle download button click
downloadBtn.addEventListener("click", () => {
  const outputText = outputTextElem.value;
  const toLang = outputLanguage.dataset.value;

  if (outputText && toLang) {
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `translated-to-${toLang}.txt`;
    a.href = url;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  }
});

// Handle dark mode toggle
darkModeCheckbox.addEventListener("change", () => {
  document.body.classList.toggle("dark");
});
