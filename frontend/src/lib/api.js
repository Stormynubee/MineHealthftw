import axios from "axios";

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const BACKEND_URL = isLocal ? "http://127.0.0.1:8000" : "";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const showXP = (amount) => {
  if (!amount) return;
  const el = document.createElement("div");
  el.className = "xp-pop";
  el.style.left = `${window.innerWidth / 2 - 40}px`;
  el.style.top = `${window.innerHeight / 2}px`;
  el.textContent = `${amount > 0 ? "+" : ""}${amount} XP`;
  if (amount < 0) el.style.color = "#EF4444";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
};
