/*
 * BridgeCap
 * Author: Aseel
 * (c) 2026 Aseel. All rights reserved.
 *
 * File: storage.js
 * Saves and loads the app data in the browser (localStorage). No server.
 */

"use strict";

const STORAGE_KEY = "bridgecap_state_v2";

// Save data. try/catch because saving can fail (private mode or full storage).
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("BridgeCap: could not save data", err);
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
    console.warn("BridgeCap: saved data is broken, starting fresh", err);
    return null;
  }
}

// Delete all saved data (used by the "Reset demo data" button).
function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("bridgecap_state_v1"); // old version key
  } catch (err) {
    console.warn("BridgeCap: could not clear data", err);
  }
}
