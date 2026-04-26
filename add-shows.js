import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
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
  signInBtn: document.getElementById("addPageSignInBtn"),
  signOutBtn: document.getElementById("addPageSignOutBtn"),
  userInfo: document.getElementById("addPageUserInfo"),
  showNames: document.getElementById("addPageShowNames"),
  addShowsBtn: document.getElementById("addPageAddShowsBtn"),
  status: document.getElementById("addPageStatus"),
};

function setStatus(message) {
  elements.status.textContent = message;
}

function setSignedIn(enabled) {
  elements.showNames.disabled = !enabled;
  elements.addShowsBtn.disabled = !enabled;
  elements.signInBtn.disabled = enabled;
  elements.signOutBtn.disabled = !enabled;
}

function isValidShowName(name) {
  if (!name || name.includes("/")) {
    setStatus('Show names cannot be empty or contain "/".');
    return false;
  }
  return true;
}

function createShowData() {
  return {
    ep: 0,
    history: [],
    usage: 0,
    created: Date.now(),
  };
}

async function addShows() {
  if (!auth.currentUser) {
    setStatus("Please sign in first.");
    return;
  }

  const names = elements.showNames.value
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    setStatus("Enter at least one show name.");
    return;
  }

  if (!names.every(isValidShowName)) return;

  elements.addShowsBtn.disabled = true;
  setStatus("Adding shows...");

  try {
    const uniqueNames = [...new Set(names)];
    let createdCount = 0;
    let skippedCount = 0;

    await Promise.all(
      uniqueNames.map(async (name) => {
        const showRef = doc(collection(db, "shows"), name);
        const snapshot = await getDoc(showRef);

        if (snapshot.exists()) {
          skippedCount += 1;
          return;
        }

        await setDoc(showRef, createShowData());
        createdCount += 1;
      })
    );

    elements.showNames.value = "";
    setStatus(`Added ${createdCount} show(s). Skipped ${skippedCount} existing show(s).`);
  } catch (error) {
    console.error(error);
    setStatus("Failed to add shows. Check your connection and permissions.");
  } finally {
    elements.addShowsBtn.disabled = false;
  }
}

elements.signInBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus("Sign-in failed: " + error.message);
  }
});

elements.signOutBtn.addEventListener("click", async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error(error);
    setStatus("Sign-out failed.");
  }
});

elements.addShowsBtn.addEventListener("click", addShows);

onAuthStateChanged(auth, (user) => {
  if (user) {
    elements.userInfo.textContent = `Logged in as: ${user.email}`;
    setSignedIn(true);
    setStatus("");
  } else {
    elements.userInfo.textContent = "Not signed in";
    setSignedIn(false);
    setStatus("Sign in to add shows.");
  }
});

setSignedIn(false);
