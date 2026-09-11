"use strict";
const slugs = window.slugs;

// elements
const screen = document.getElementById("screen");
const wrapper = document.getElementById("wrapper");
const switchElement = document.getElementById("switch");
const alertContainer = document.querySelector("[data-alert-container]");
const guessGrid = document.querySelector("[data-guess-grid]");
const keyboard = document.querySelector("[data-keyboard]");
const timer = document.querySelector(".countdown-timer");

// variables
let mode = "dark";
let quibMD5 = "";
let permutedQuib = "";

// dates for retrieving daily quib — compute days in UTC so it's stable across timezones
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// base start date (April 15, 2023) expressed as UTC midnight
const BASE_UTC = Date.UTC(2023, 3, 15); // month is 0-indexed (April = 3)
const today = new Date();
const TODAY_UTC = Date.UTC(
  today.getUTCFullYear(),
  today.getUTCMonth(),
  today.getUTCDate(),
);
const days = Math.floor((TODAY_UTC - BASE_UTC) / MS_PER_DAY);

(function () {
  // Load local CSV of quotes and choose a deterministic daily quote.
  // `quotes.csv` is expected to have a header row including `quote` and `author` columns.
  function parseCSVToObjects(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines
      .shift()
      .split(",")
      .map((h) => h.trim());
    return lines.map((line) => {
      const values = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          values.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      values.push(cur);
      const obj = {};
      for (let i = 0; i < header.length; i++) {
        obj[header[i]] = (values[i] || "").trim();
      }
      return obj;
    });
  }

  // choose CSV by query param: ?lang=pt or ?lang=pt-BR loads Portuguese (Brazil) quotes
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const lang = (getQueryParam("lang") || "").toLowerCase();
  const fileName =
    lang === "pt" || lang === "pt-br" ? "quotes_pt_br.csv" : "quotes.csv";

  fetch(fileName)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${fileName}`);
      return r.text();
    })
    .then((text) => {
      const rows = parseCSVToObjects(text);
      if (!rows || rows.length === 0) throw new Error("No quotes found in CSV");
      const idx = days % rows.length;
      const row = rows[idx];
      const content = row.quote || row.text || "";
      let author = row.author || row.a || "Unknown";
      author = author.replace(/,+$/g, "").trim();
      setData({ content, author: author || "Unknown" });
    })
    .catch((err) => {
      console.error("Loading quotes.csv failed:", err);
      setData({
        content: "Be yourself; everyone else is already taken.",
        author: "Oscar Wilde",
      });
    });

  const totalGames = window.localStorage.getItem("totalGames") || 0;
  window.localStorage.setItem("totalGames", Number(totalGames) + 1);
})();

// event listener for toggling light/dark mode
switchElement.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.body.classList.remove("dark-mode");

  if (mode === "light") {
    mode = "dark";
  } else {
    mode = "light";
  }
  lightDarkMode();
});

// light/dark mode toggle function
function lightDarkMode() {
  const bgcolor = getComputedStyle(document.documentElement).getPropertyValue(
    "--bgcolor",
  );
  const fgcolor = getComputedStyle(document.documentElement).getPropertyValue(
    "--fgcolor",
  );
  const logo = document.getElementById("logo");
  logo.src = mode == "dark" ? "tangle-dark.svg" : "tangle-light.svg";

  document.documentElement.style.setProperty("--bgcolor", fgcolor);
  document.documentElement.style.setProperty("--fgcolor", bgcolor);
}

// function to create permuted alphabet. If `seed` is provided, a deterministic
// shuffle will be produced using a seeded PRNG so the cipher is stable per day.
function shuffle(string, seed) {
  const a = string.split("");
  const n = a.length;

  // mulberry32 PRNG
  function mulberry32(v) {
    let t = v >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = seed != null ? mulberry32(Number(seed)) : Math.random;

  for (let i = n - 1; i > 0; i--) {
    const r = typeof rand === "function" ? rand() : Math.random();
    let j = Math.floor(r * (i + 1));
    let tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join("");
}

// normalize accented characters (e.g., á→a, ã→a, é→e, ç→c)
function normalizeAccents(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// update stats on win
function updateStats(totalSolved) {
  const totalSolvedElement = document.getElementById("total-solved");
  totalSolvedElement.innerText = totalSolved;
}

// setup game
function setData(data) {
  //   console.log(data); // don't look, cheater!
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const permuted = shuffle(alphabet, days);

  updateStats(window.localStorage.getItem("totalSolved") || 0);

  // normalize accents in quote and author for consistent gameplay
  const normalizedContent = normalizeAccents(data.content);
  const normalizedAuthor = normalizeAccents(data.author);
  const fullText = normalizedContent + " " + normalizedAuthor;

  quibMD5 = md5(fullText.replace(/\s+/g, " ").split(" ").join(""));

  permutedQuib = fullText.toLowerCase();

  let i = 0;
  let result = "";
  while (i < permutedQuib.length) {
    let ind = alphabet.indexOf(permutedQuib.charAt(i));
    result += permuted.charAt(ind) || permutedQuib.charAt(i);
    i++;
  }

  permutedQuib = result;
  init();
}

// display navigation modals
function display(modal) {
  screen.classList.toggle("hide");
  wrapper.classList.toggle("hide");
  document.getElementById(modal).classList.toggle("hide");
}

// close navigation modals
function closed(modal) {
  screen.classList.toggle("hide");
  wrapper.classList.toggle("hide");
  document.getElementById(modal).classList.toggle("hide");
}

// initialize game
function init() {
  lightDarkMode();

  // split quib into an array of words
  const wordsArray = createWords(permutedQuib);
  for (let word of wordsArray) {
    const div = document.createElement("div");
    div.className = "word";
    guessGrid.appendChild(div);
  }

  // loop through words with createLetterTile and wrap in word class div
  const wordElements = document.querySelectorAll(".word");
  for (let i = 0; i < wordsArray.length; i++) {
    for (let letter of wordsArray[i]) {
      createLetterTile(wordElements[i], letter.toUpperCase());
    }
    const div = document.createElement("div");
    const tile = document.createElement("div");
    div.className = "space";
    tile.className = "tile hidden opacity";
    div.appendChild(tile);
    wordElements[i].appendChild(div);
  }

  // begin
  startInteraction();
}

// split string into an array of words
function createWords(string) {
  return string.split(" ");
}

// create tiles, watch for new lines
function createLetterTile(parentDiv, letter) {
  const div = document.createElement("div");
  const tile = document.createElement("button");
  div.className = "letter";
  tile.className = "tile";
  div.dataset.letter = letter;
  div.innerHTML = letter;

  if (letter.toUpperCase() === letter.toLowerCase()) {
    tile.className = "tile hidden";
    if (letter === "\n") {
      tile.className = "tile hidden opacity";
    }
    tile.dataset.letter = letter;
    tile.innerHTML = letter;
  }

  div.appendChild(tile);
  parentDiv.appendChild(div);
}

// allow user interaction
function startInteraction() {
  document.addEventListener("click", handleMouseClick);
  document.addEventListener("keydown", handleKeyPress);
}

// disable user interaction
function stopInteraction() {
  document.removeEventListener("click", handleMouseClick);
  document.removeEventListener("keydown", handleKeyPress);
}

// mouse (on-screen keyboard) input function
function handleMouseClick(e) {
  if (e.target.matches("[data-key]")) {
    pressKey(e.target.dataset.key.toLowerCase());
    return;
  }
  if (e.target.matches("[data-enter]")) {
    submitGuess();
    return;
  }
  if (e.target.matches("[data-delete]")) {
    deleteKeys();
    return;
  }
  // clicked a tile box, add active dataset state to all matches
  if (e.srcElement.matches(".tile")) {
    removeAllActiveTiles();

    // get letter data from parent node of guess
    const letter = e.srcElement.parentNode.getAttribute(["data-letter"]);

    setAllActiveTiles(letter);
  }
}

// keyboard input function
function handleKeyPress(e) {
  if (e.key === "Enter") {
    submitGuess();
    return;
  }
  if (e.key === "Backspace" || e.key === "Delete") {
    deleteKeys();
    return;
  }
  if (e.key.match(/^[a-z]$/)) {
    pressKey(e.key);
    return;
  }
}

// input key function
function pressKey(key) {
  const activeTiles = getActiveTiles();

  // active tiles have a letter, remove used from keyboard
  if (activeTiles[0]?.dataset.letter) {
    const keyboardKey = keyboard.querySelector(
      `[data-key="${activeTiles[0].dataset.letter}"i]`,
    );
    keyboardKey.classList.toggle("used");
  }

  // check if letter is already guessed, if so it must be removed from the other tiles
  const guessedLetters = getGuessedLetters();
  if (guessedLetters.includes(key.toUpperCase())) {
    const removeTiles = getGuessTiles(key);
    for (let tile of removeTiles) {
      tile.textContent = "";
      delete tile.dataset.state;
      delete tile.dataset.letter;
    }
  }

  // set all active tiles to letter guess
  for (let tile of activeTiles) {
    tile.dataset.letter = key.toLowerCase();
    tile.textContent = key;
  }

  // update keyboard, darken used key
  const keyboardKey = keyboard.querySelector(`[data-key="${key}"i]`);
  keyboardKey.classList.add("used");

  // set active tiles to next empty tile (exclude 'space' tiles)
  const nextTile = guessGrid.querySelector(
    ":not([data-letter]):not(.hidden):not(.word):not(.space)",
  );
  removeAllActiveTiles();
  setAllActiveTiles(nextTile?.parentNode.getAttribute(["data-letter"]));
}

// remove all occurrences of guessed letter
function deleteKeys() {
  const activeTiles = getActiveTiles();

  if (activeTiles == null) return;
  const keyboardKey = keyboard.querySelector(
    `[data-key="${activeTiles[0].dataset.letter}"i]`,
  );
  keyboardKey?.classList.toggle("used");
  for (let tile of activeTiles) {
    tile.textContent = "";
    delete tile.dataset.state;
    delete tile.dataset.letter;
  }
}

// get all occurrences of guesssed letter
function getGuessTiles(letter) {
  return guessGrid.querySelectorAll(`[data-letter="${letter}"]`);
}

// get all currently active tiles
function getActiveTiles() {
  return guessGrid.querySelectorAll('[data-state="active"]');
}

// get all letter tiles
function getLetterTiles() {
  return document.querySelectorAll(".tile:not(.opacity)");
}

// remove all currently active tiles
function removeAllActiveTiles() {
  const activeTiles = getActiveTiles();

  for (let tile of activeTiles) {
    delete tile.dataset.state;
  }
}

// sets all locations of a letter to active
function setAllActiveTiles(letter) {
  // find all same letters (returns nodelist)
  const letterLocations = document.querySelectorAll(
    `[data-letter='${letter}']`,
  );

  // change all children tiles values to guess
  for (let node of letterLocations) {
    node.firstElementChild.dataset.state = "active";
  }
}

// returns letters that have been used already
function getGuessedLetters() {
  const keyboardKeys = keyboard.querySelectorAll(".used");
  let letters = [];

  for (let keyboardKey of keyboardKeys) {
    letters.push(keyboardKey.dataset.key);
  }

  return letters;
}

// stop interaction and check for win
function submitGuess() {
  stopInteraction();
  checkWinLose(getGuess());
}

// function to get guess string
function getGuess() {
  // query select all tiles add up everything to a guess string
  const tiles = document.querySelectorAll(".tile:not(.opacity)");
  let guess = "";

  for (let tile of tiles) {
    guess += tile.dataset.letter;
  }
  return guess;
}

// check for win
function checkWinLose(guess) {
  if (md5(guess) === quibMD5) {
    showAlert("You Win!", 5000);
    danceTiles(getLetterTiles());

    const totalSolved = window.localStorage.getItem("totalSolved") || 0;
    window.localStorage.setItem("totalSolved", Number(totalSolved) + 1);

    updateStats(totalSolved);

    return;
  }

  // else keep trying alert, restart interaction
  showAlert("Keep Trying...", 3000);
  shakeTiles(getLetterTiles());
  startInteraction();
}

// keep trying animation
function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true },
    );
  });
}

// you win animation
function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(
      () => {
        tile.classList.add("dance");
        tile.addEventListener(
          "animationend",
          () => {
            tile.classList.remove("dance");
          },
          { once: true },
        );
      },
      (index * 50) / 5,
    );
  });
}

// show alerts
function showAlert(message, duration = 1000) {
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) return;
  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

// show timer
function showTimer() {
  let d = new Date();
  d.setHours(24, 0, 0, 0);
  //   timer.innerHTML = d;
}
showTimer();
