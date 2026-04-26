import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
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

const elements = {
  avatar: document.getElementById("dashboardAvatar"),
  name: document.getElementById("dashboardName"),
  email: document.getElementById("dashboardEmail"),
  totalShows: document.getElementById("dashboardTotalShows"),
  completedShows: document.getElementById("dashboardCompletedShows"),
  favoriteShow: document.getElementById("dashboardFavoriteShow"),
  favoriteNote: document.getElementById("dashboardFavoriteNote"),
  mostUpdated: document.getElementById("dashboardMostUpdated"),
  mostUpdatedNote: document.getElementById("dashboardMostUpdatedNote"),
  episodesWatched: document.getElementById("dashboardEpisodesWatched"),
  inProgress: document.getElementById("dashboardInProgress"),
  averageEpisode: document.getElementById("dashboardAverageEpisode"),
  history: document.getElementById("dashboardHistory"),
};

let unsubscribeShows = null;

document.body.classList.toggle("dark-mode", localStorage.getItem("darkMode") === "true");

function normalizeShow(data = {}) {
  return {
    ep: Number.isFinite(Number(data.ep)) ? Math.max(0, Number(data.ep)) : 0,
    history: Array.isArray(data.history) ? data.history.map(String) : [],
    usage: Number.isFinite(Number(data.usage))
      ? Math.max(0, Number(data.usage))
      : 0,
    status: String(data.status || "").toLowerCase(),
    completed: Boolean(data.completed),
    favorite: Boolean(data.favorite),
    created: Number.isFinite(Number(data.created)) ? Number(data.created) : 0,
  };
}

function setTextWithTitle(element, value) {
  element.textContent = value;
  if (value && value !== "-") {
    element.title = value;
  } else {
    element.removeAttribute("title");
  }
}

function renderUser(user) {
  elements.avatar.textContent = "?";
  elements.avatar.replaceChildren();

  if (!user) {
    elements.avatar.textContent = "?";
    elements.name.textContent = "Not signed in";
    elements.email.textContent = "Sign in from the tracker drawer to view stats.";
    return;
  }

  const displayName = user.displayName || "Donghua fan";
  if (user.photoURL) {
    const image = document.createElement("img");
    image.src = user.photoURL;
    image.alt = "";
    elements.avatar.appendChild(image);
  } else {
    elements.avatar.textContent = displayName.trim().charAt(0) || user.email?.charAt(0) || "?";
  }
  elements.name.textContent = displayName;
  elements.email.textContent = user.email || "Google account connected";
}

function showEmptyHistory(message) {
  elements.history.innerHTML = "";
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state dashboard-empty";
  emptyState.textContent = message;
  elements.history.appendChild(emptyState);
}

function getHistoryDate(entry) {
  const [, dateText] = entry.split(" on ");
  const timestamp = Date.parse(dateText || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function renderHistory(entries) {
  elements.history.innerHTML = "";
  if (entries.length === 0) {
    showEmptyHistory("No episode history yet.");
    return;
  }

  entries.slice(0, 8).forEach(({ show, entry }) => {
    const item = document.createElement("div");
    item.className = "activity-item";

    const title = document.createElement("strong");
    title.textContent = show;
    item.appendChild(title);

    const detail = document.createElement("span");
    detail.textContent = entry;
    item.appendChild(detail);

    elements.history.appendChild(item);
  });
}

function renderDashboard(shows) {
  const entries = Object.entries(shows);
  const totalShows = entries.length;
  const completedShows = entries.filter(
    ([, data]) => data.completed || data.status === "completed"
  ).length;
  const episodesWatched = entries.reduce((total, [, data]) => total + data.ep, 0);
  const inProgress = entries.filter(([, data]) => data.ep > 0 && data.status !== "completed").length;
  const averageEpisode = totalShows > 0 ? Math.round(episodesWatched / totalShows) : 0;
  const pinnedFavorite = entries.find(([, data]) => data.favorite);
  const episodeFavorite = entries.reduce(
    (top, entry) => (!top || entry[1].ep > top[1].ep ? entry : top),
    null
  );
  const favorite = pinnedFavorite || episodeFavorite;
  const mostUpdated = entries.reduce(
    (top, entry) => (!top || entry[1].usage > top[1].usage ? entry : top),
    null
  );
  const history = entries
    .flatMap(([show, data]) =>
      data.history.map((entry) => ({
        show,
        entry,
        timestamp: getHistoryDate(entry),
      }))
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  elements.totalShows.textContent = totalShows;
  elements.completedShows.textContent = completedShows;
  elements.episodesWatched.textContent = episodesWatched;
  elements.inProgress.textContent = inProgress;
  elements.averageEpisode.textContent = averageEpisode;

  if (favorite && (favorite[1].favorite || favorite[1].ep > 0)) {
    setTextWithTitle(elements.favoriteShow, favorite[0]);
    elements.favoriteNote.textContent = favorite[1].favorite
      ? "Pinned favorite"
      : `Episode ${favorite[1].ep}`;
  } else {
    setTextWithTitle(elements.favoriteShow, "-");
    elements.favoriteNote.textContent = "Highest episode count";
  }

  if (mostUpdated && mostUpdated[1].usage > 0) {
    setTextWithTitle(elements.mostUpdated, mostUpdated[0]);
    elements.mostUpdatedNote.textContent = `${mostUpdated[1].usage} updates`;
  } else {
    setTextWithTitle(elements.mostUpdated, "-");
    elements.mostUpdatedNote.textContent = "No updates yet";
  }

  renderHistory(history);
}

function renderSignedOut() {
  renderUser(null);
  renderDashboard({});
  showEmptyHistory("Sign in from the tracker drawer to load your dashboard.");
}

function listenForShows() {
  if (unsubscribeShows) unsubscribeShows();
  unsubscribeShows = onSnapshot(
    collection(db, "shows"),
    (snapshot) => {
      const shows = {};
      snapshot.forEach((docSnap) => {
        shows[docSnap.id] = normalizeShow(docSnap.data());
      });
      renderDashboard(shows);
    },
    (error) => {
      console.error(error);
      showEmptyHistory("Could not load dashboard data.");
    }
  );
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (unsubscribeShows) unsubscribeShows();
    unsubscribeShows = null;
    renderSignedOut();
    return;
  }

  renderUser(user);
  listenForShows();
});

renderSignedOut();
