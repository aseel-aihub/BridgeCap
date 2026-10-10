/*
 * Wakib
 * Author: Aseel
 * (c) 2026 Aseel. All rights reserved.
 *
 * File: storage.js
 * Saves and loads the app data in the browser (localStorage). No server.
 */

"use strict";

const STORAGE_KEY = "wakib_state_v1";

// Save data. try/catch because saving can fail (private mode or full storage).
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("Wakib: could not save data", err);
    return false;
  }
}

// Load data. Returns null if nothing saved or the data is broken.
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Wakib: saved data is broken, starting fresh", err);
    return null;
  }
}

// Delete all saved data (used by the "Reset demo data" button).
function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // old keys from when the project was called BridgeCap
    localStorage.removeItem("bridgecap_state_v2");
    localStorage.removeItem("bridgecap_state_v1");
  } catch (err) {
    console.warn("Wakib: could not clear data", err);
  }
}
