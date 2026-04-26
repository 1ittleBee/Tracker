import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLPxspkEMpxoXkFAVLrE8ZENz3PuIGQ0M",
  authDomain: "donghuatracker.firebaseapp.com",
  projectId: "donghuatracker",
  storageBucket: "donghuatracker.appspot.com",
  messagingSenderId: "235741425337",
  appId: "1:235741425337:web:7eaaba2623dab340c47568",
  measurementId: "G-XKF22H3TTD",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const elements = {
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  userInfo: document.getElementById("userInfo"),
  drawerToggle: document.getElementById("drawerToggle"),
  drawerClose: document.getElementById("drawerClose"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  appDrawer: document.getElementById("appDrawer"),
  drawerExportJSONBtn: document.getElementById("drawerExportJSONBtn"),
  drawerImportBtn: document.getElementById("drawerImportBtn"),
  drawerExportCSVBtn: document.getElementById("drawerExportCSVBtn"),
  drawerDarkModeBtn: document.getElementById("drawerDarkModeBtn"),
  drawerFrequentBtn: document.getElementById("drawerFrequentBtn"),
  showNames: document.getElementById("showNames"),
  addShowsBtn: document.getElementById("addShowsBtn"),
  exportJSONBtn: document.getElementById("exportJSONBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  exportCSVBtn: document.getElementById("exportCSVBtn"),
  darkModeBtn: document.getElementById("darkModeBtn"),
  frequentBtn: document.getElementById("frequentBtn"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  jumpPage: document.getElementById("jumpPage"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  showList: document.getElementById("showList"),
  pageInfo: document.getElementById("pageInfo"),
  totalShowsStat: document.getElementById("totalShowsStat"),
  inProgressStat: document.getElementById("inProgressStat"),
  episodesWatchedStat: document.getElementById("episodesWatchedStat"),
  mostUsedStat: document.getElementById("mostUsedStat"),
  mostUsedNote: document.getElementById("mostUsedNote"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  profileShows: document.getElementById("profileShows"),
  profileEpisodes: document.getElementById("profileEpisodes"),
  profileStatus: document.getElementById("profileStatus"),
};

const appControls = [
  elements.showNames,
  elements.addShowsBtn,
  elements.exportJSONBtn,
  elements.importBtn,
  elements.exportCSVBtn,
  elements.frequentBtn,
  elements.drawerExportJSONBtn,
  elements.drawerImportBtn,
  elements.drawerExportCSVBtn,
  elements.drawerFrequentBtn,
  elements.searchInput,
  elements.sortSelect,
  elements.pageSizeSelect,
  elements.jumpPage,
  elements.prevBtn,
  elements.nextBtn,
];

let shows = {};
let currentPage = 1;
let showsPerPage = 10;
let darkMode = localStorage.getItem("darkMode") === "true";
let unsubscribeShows = null;

document.body.classList.toggle("dark-mode", darkMode);

function getShowsCollection() {
  if (!auth.currentUser) throw new Error("User is not signed in");
  return collection(db, "shows");
}

function getShowRef(show) {
  return doc(getShowsCollection(), show);
}

function setAppControlsEnabled(enabled) {
  appControls.forEach((control) => {
    control.disabled = !enabled;
  });
  elements.signInBtn.disabled = enabled;
  elements.signOutBtn.disabled = !enabled;
}

function setDrawerOpen(isOpen) {
  elements.appDrawer.hidden = !isOpen;
  elements.drawerBackdrop.hidden = !isOpen;
  elements.drawerToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    elements.drawerClose.focus();
  } else {
    elements.drawerToggle.focus();
  }
}

function scrollToElement(element) {
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusElement(element) {
  window.setTimeout(() => element?.focus(), 250);
}

function handleFeatureHash({ scroll = true } = {}) {
  const action = window.location.hash.slice(1);
  if (!action) return;

  const controlPanel = elements.showNames.closest(".panel");
  const actionHandlers = {
    "add-shows": () => {
      scrollToElement(controlPanel);
      focusElement(elements.showNames);
    },
    "add-episode": () => {
      if (scroll) scrollToElement(elements.showList);
    },
    "manage-shows": () => {
      if (scroll) scrollToElement(elements.showList);
    },
    history: () => {
      if (scroll) scrollToElement(elements.showList);
    },
    "search-sort": () => {
      scrollToElement(elements.searchInput);
      focusElement(elements.searchInput);
    },
    "frequently-used": () => {
      showFrequent();
      if (scroll) scrollToElement(elements.showList);
    },
    backup: () => {
      scrollToElement(controlPanel);
      focusElement(elements.exportJSONBtn);
    },
    theme: () => {
      toggleDarkMode();
      scrollToElement(elements.darkModeBtn);
      window.history.replaceState(null, "", window.location.pathname);
    },
  };

  actionHandlers[action]?.();
}

function applyPersistentFeatureHash() {
  if (window.location.hash === "#frequently-used") {
    showFrequent();
  }
}

function renderProfile(user) {
  const entries = Object.entries(shows);
  const totalShows = entries.length;
  const episodesWatched = entries.reduce((total, [, data]) => total + data.ep, 0);

  elements.profileShows.textContent = totalShows;
  elements.profileEpisodes.textContent = episodesWatched;

  if (!user) {
    elements.profileAvatar.textContent = "?";
    elements.profileName.textContent = "Not signed in";
    elements.profileEmail.textContent = "Sign in with Google to sync your tracker.";
    elements.profileStatus.textContent = "Offline";
    return;
  }

  const displayName = user.displayName || "Donghua fan";
  const initial = displayName.trim().charAt(0) || user.email?.charAt(0) || "?";

  elements.profileAvatar.textContent = "";
  if (user.photoURL) {
    const avatarImage = document.createElement("img");
    avatarImage.src = user.photoURL;
    avatarImage.alt = "";
    elements.profileAvatar.appendChild(avatarImage);
  } else {
    elements.profileAvatar.textContent = initial;
  }

  elements.profileName.textContent = displayName;
  elements.profileEmail.textContent = user.email || "Google account connected";
  elements.profileStatus.textContent = "Online";
}

function stopRealtime() {
  if (unsubscribeShows) {
    unsubscribeShows();
    unsubscribeShows = null;
  }
}

function isValidShowName(name) {
  if (!name || name.includes("/")) {
    alert('Show names cannot be empty or contain "/".');
    return false;
  }
  return true;
}

function normalizeShow(data = {}) {
  data = data || {};
  return {
    ep: Number.isFinite(Number(data.ep)) ? Math.max(0, Number(data.ep)) : 0,
    history: Array.isArray(data.history) ? data.history.map(String) : [],
    usage: Number.isFinite(Number(data.usage))
      ? Math.max(0, Number(data.usage))
      : 0,
    created: Number.isFinite(Number(data.created))
      ? Number(data.created)
      : Date.now(),
  };
}

function initRealtime() {
  stopRealtime();
  unsubscribeShows = onSnapshot(
    getShowsCollection(),
    (snapshot) => {
      shows = {};
      snapshot.forEach((docSnap) => {
        shows[docSnap.id] = normalizeShow(docSnap.data());
      });
      render();
    },
    (error) => {
      console.error("Realtime listener failed:", error);
      alert("Could not load your shows. Check Firestore permissions.");
    }
  );
}

async function saveShowToDB(name) {
  if (!auth.currentUser) return alert("Please sign in");
  try {
    await setDoc(getShowRef(name), shows[name]);
  } catch (error) {
    console.error("Error saving show:", error);
    throw error;
  }
}

async function addShows() {
  if (!auth.currentUser) return alert("Please sign in");
  const input = elements.showNames.value.trim();
  if (!input) return;

  const names = input
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.every(isValidShowName)) return;

  try {
    await Promise.all(
      names.map((name) => {
        if (!shows[name]) shows[name] = normalizeShow({ created: Date.now() });
        return saveShowToDB(name);
      })
    );
    elements.showNames.value = "";
    render();
  } catch (error) {
    alert("Failed to save one or more shows.");
  }
}

async function changeEpisode(show, direction) {
  if (!auth.currentUser) return alert("Please sign in");
  const showRef = getShowRef(show);

  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(showRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const oldEp = data.ep || 0;
      const newEp = oldEp + direction;
      if (newEp < 0) return;

      transaction.update(showRef, {
        ep: newEp,
        history: [
          ...(data.history || []),
          `${oldEp} -> ${newEp} on ${new Date().toLocaleDateString()}`,
        ],
        usage: (data.usage || 0) + 1,
      });
    });
  } catch (error) {
    console.error(error);
  }
}

async function updateEpisode(show) {
  if (!auth.currentUser) return alert("Please sign in");
  const epInput = prompt(`Enter last watched episode for ${show}:`);
  const ep = parseInt(epInput, 10);
  if (isNaN(ep) || ep < 0) return;

  const showRef = getShowRef(show);
  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(showRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      transaction.update(showRef, {
        ep,
        history: [
          ...(data.history || []),
          `${data.ep} -> ${ep} on ${new Date().toLocaleDateString()}`,
        ],
        usage: (data.usage || 0) + 1,
      });
    });
  } catch (error) {
    console.error(error);
  }
}

async function editShowName(oldName) {
  if (!auth.currentUser) return alert("Please sign in");
  const newName = prompt("Edit donghua name:", oldName)?.trim();
  if (!newName || newName === oldName || !isValidShowName(newName)) return;

  const oldRef = getShowRef(oldName);
  const newRef = getShowRef(newName);
  try {
    await runTransaction(db, async (transaction) => {
      const oldSnap = await transaction.get(oldRef);
      const newSnap = await transaction.get(newRef);
      if (!oldSnap.exists()) return;
      if (newSnap.exists()) return alert("A show with this name already exists.");

      transaction.set(newRef, oldSnap.data());
      transaction.delete(oldRef);
    });
  } catch (error) {
    console.error(error);
  }
}

async function deleteShow(show) {
  if (!auth.currentUser) return alert("Please sign in");
  if (!confirm(`Delete ${show}?`)) return;

  try {
    await deleteDoc(getShowRef(show));
  } catch (error) {
    console.error(error);
  }
}

function toggleDarkMode() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark-mode", darkMode);
  localStorage.setItem("darkMode", darkMode);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(shows, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "donghua_shows.json");
}

function handleImport(event) {
  if (!auth.currentUser) return alert("Please sign in");
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    try {
      const imported = JSON.parse(loadEvent.target.result);
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
        throw new Error("Imported file must contain a show object.");
      }

      const entries = Object.entries(imported).map(([name, data]) => [
        String(name).trim(),
        data,
      ]);
      if (!entries.every(([name]) => isValidShowName(name))) return;

      await Promise.all(
        entries.map(([name, data]) => {
          shows[name] = normalizeShow(data);
          return saveShowToDB(name);
        })
      );
      render();
      alert("Import successful!");
    } catch (error) {
      console.error(error);
      alert("Import failed");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  const headers = ["Name", "Episode", "Created", "History", "Usage"];
  const rows = Object.entries(shows).map(([name, data]) => [
    name,
    data.ep,
    new Date(data.created).toISOString(),
    data.history.join(" | "),
    data.usage,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  downloadBlob(new Blob([`${csv}\n`], { type: "text/csv" }), "donghua_shows.csv");
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  const safeValue = /^[=+\-@]/.test(stringValue)
    ? `'${stringValue}`
    : stringValue;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function changePageSize() {
  showsPerPage = parseInt(elements.pageSizeSelect.value, 10);
  currentPage = 1;
  render();
}

function jumpToPage() {
  const page = parseInt(elements.jumpPage.value, 10);
  if (!isNaN(page)) currentPage = page;
  render();
}

function nextPage() {
  const totalPages = Math.ceil(filteredShows().length / showsPerPage);
  if (currentPage < totalPages) currentPage++;
  render();
}

function prevPage() {
  if (currentPage > 1) currentPage--;
  render();
}

function filteredShows() {
  const searchTerm = elements.searchInput.value.toLowerCase();
  const sortBy = elements.sortSelect.value;
  const result = Object.entries(shows).filter(([name]) =>
    name.toLowerCase().includes(searchTerm)
  );

  if (sortBy === "created") result.sort((a, b) => a[1].created - b[1].created);
  if (sortBy === "name") result.sort((a, b) => a[0].localeCompare(b[0]));
  if (sortBy === "ep") result.sort((a, b) => b[1].ep - a[1].ep);

  return result;
}

function updateStats() {
  const entries = Object.entries(shows);
  const totalShows = entries.length;
  const inProgress = entries.filter(([, data]) => data.ep > 0).length;
  const episodesWatched = entries.reduce((total, [, data]) => total + data.ep, 0);
  const mostUsed = entries.reduce(
    (top, entry) => (!top || entry[1].usage > top[1].usage ? entry : top),
    null
  );

  elements.totalShowsStat.textContent = totalShows;
  elements.inProgressStat.textContent = inProgress;
  elements.episodesWatchedStat.textContent = episodesWatched;

  if (mostUsed && mostUsed[1].usage > 0) {
    elements.mostUsedStat.textContent = mostUsed[0];
    elements.mostUsedStat.title = mostUsed[0];
    elements.mostUsedNote.textContent = `${mostUsed[1].usage} updates`;
  } else {
    elements.mostUsedStat.textContent = "-";
    elements.mostUsedStat.removeAttribute("title");
    elements.mostUsedNote.textContent = "No usage yet";
  }

  renderProfile(auth.currentUser);
}

function showEmptyState(message, detail) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const title = document.createElement("strong");
  title.textContent = message;
  emptyState.appendChild(title);

  const text = document.createElement("span");
  text.textContent = detail;
  emptyState.appendChild(text);
  elements.showList.appendChild(emptyState);
}

function createShowRow(show, data, includeUsage = false) {
  const div = document.createElement("div");
  div.className = "show";

  const infoDiv = document.createElement("div");
  infoDiv.className = "show-info";
  infoDiv.appendChild(createShowTitle(show));
  infoDiv.appendChild(createShowMeta(data, includeUsage));
  infoDiv.appendChild(createHistory(data));
  div.appendChild(infoDiv);

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "buttons";
  createShowButtons(show).forEach((button) => buttonsDiv.appendChild(button));
  div.appendChild(buttonsDiv);

  return div;
}

function createShowTitle(show) {
  const title = document.createElement("strong");
  title.textContent = show;
  return title;
}

function createShowMeta(data, includeUsage) {
  const metaDiv = document.createElement("div");
  metaDiv.className = "show-meta";

  const episodeBadge = document.createElement("span");
  episodeBadge.className = "episode-badge";
  episodeBadge.textContent = `Episode ${data.ep}`;
  metaDiv.appendChild(episodeBadge);

  if (includeUsage) {
    const usageBadge = document.createElement("span");
    usageBadge.className = "usage-badge";
    usageBadge.textContent = `Used ${data.usage} times`;
    metaDiv.appendChild(usageBadge);
  }

  return metaDiv;
}

function createHistory(data) {
  const historyDiv = document.createElement("div");
  historyDiv.className = "history";
  const lastLog =
    data.history.length > 0 ? data.history[data.history.length - 1] : "No history";
  historyDiv.textContent = `Latest: ${lastLog}`;
  return historyDiv;
}

function createShowButtons(show) {
  const buttonConfigs = [
    ["+", "inc-btn", `Increase episode for ${show}`, () => changeEpisode(show, 1)],
    ["-", "dec-btn", `Decrease episode for ${show}`, () => changeEpisode(show, -1)],
    ["Edit ep", "update-btn", `Edit episode for ${show}`, () => updateEpisode(show)],
    ["Rename", "edit-btn", `Rename ${show}`, () => editShowName(show)],
    ["Delete", "delete-btn", `Delete ${show}`, () => deleteShow(show)],
  ];

  return buttonConfigs.map(([label, className, ariaLabel, onClick]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", onClick);
    return button;
  });
}

function showFrequent() {
  const topShows = Object.entries(shows)
    .sort((a, b) => b[1].usage - a[1].usage)
    .slice(0, 10);

  elements.showList.innerHTML = "";
  if (topShows.length === 0) {
    showEmptyState("No shows yet", "Add a few titles to see your most used list.");
  }
  topShows.forEach(([show, data]) => {
    elements.showList.appendChild(createShowRow(show, data, true));
  });
  elements.pageInfo.textContent = "Top 10 frequently used shows";
}

function render() {
  updateStats();
  elements.showList.innerHTML = "";

  const sortedShows = filteredShows();
  const totalPages = Math.ceil(sortedShows.length / showsPerPage) || 1;
  if (sortedShows.length === 0) {
    showEmptyState(
      "No matching shows",
      "Add new titles or adjust your search to bring them back."
    );
  }

  currentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const start = (currentPage - 1) * showsPerPage;
  const pageShows = sortedShows.slice(start, start + showsPerPage);
  pageShows.forEach(([show, data]) => {
    elements.showList.appendChild(createShowRow(show, data));
  });
  elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  applyPersistentFeatureHash();
}

function bindEvents() {
  elements.drawerToggle.addEventListener("click", () => setDrawerOpen(true));
  elements.drawerClose.addEventListener("click", () => setDrawerOpen(false));
  elements.drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.appDrawer.hidden) {
      setDrawerOpen(false);
    }
  });

  elements.signInBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Sign-in failed: " + error.message);
    }
  });

  elements.signOutBtn.addEventListener("click", async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error(error);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      elements.userInfo.textContent = `Logged in as: ${user.email}`;
      renderProfile(user);
      setAppControlsEnabled(true);
      initRealtime();
    } else {
      stopRealtime();
      elements.userInfo.textContent = "Not signed in";
      setAppControlsEnabled(false);
      shows = {};
      renderProfile(null);
      render();
    }
  });

  elements.addShowsBtn.addEventListener("click", addShows);
  elements.exportJSONBtn.addEventListener("click", exportJSON);
  elements.importBtn.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", handleImport);
  elements.exportCSVBtn.addEventListener("click", exportCSV);
  elements.darkModeBtn.addEventListener("click", toggleDarkMode);
  elements.frequentBtn.addEventListener("click", showFrequent);
  elements.drawerExportJSONBtn.addEventListener("click", () => {
    exportJSON();
    setDrawerOpen(false);
  });
  elements.drawerImportBtn.addEventListener("click", () => {
    elements.importFile.click();
    setDrawerOpen(false);
  });
  elements.drawerExportCSVBtn.addEventListener("click", () => {
    exportCSV();
    setDrawerOpen(false);
  });
  elements.drawerDarkModeBtn.addEventListener("click", () => {
    toggleDarkMode();
    setDrawerOpen(false);
  });
  elements.drawerFrequentBtn.addEventListener("click", () => {
    showFrequent();
    setDrawerOpen(false);
    scrollToElement(elements.showList);
  });
  elements.searchInput.addEventListener("input", render);
  elements.sortSelect.addEventListener("change", render);
  elements.pageSizeSelect.addEventListener("change", changePageSize);
  elements.jumpPage.addEventListener("input", jumpToPage);
  elements.prevBtn.addEventListener("click", prevPage);
  elements.nextBtn.addEventListener("click", nextPage);
  window.addEventListener("hashchange", handleFeatureHash);
}

setAppControlsEnabled(false);
bindEvents();
render();
handleFeatureHash();
