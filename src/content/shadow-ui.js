(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.shadowUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const SHADOW_CSS = `
:host {
  all: initial;
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  color-scheme: dark;
  font-family: "Segoe UI", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  --a: #53fc18;
  --a-soft: rgba(83, 252, 24, 0.14);
  --a-border: rgba(83, 252, 24, 0.45);
  --bili: #fb7299;
  --kick: #53fc18;
  --douyin: #25f4ee;
  --panel: #101013;
  --settings-panel: rgba(16, 16, 19, 0.96);
  --settings-ink: #edf2f8;
  --settings-muted: #9aa3b2;
  --settings-line: rgba(255, 255, 255, 0.12);
  --settings-control: #1b1e25;
  --settings-hover: #262b35;
  --text: #edf2f8;
  --muted: #9aa3b2;
  --line: rgba(255, 255, 255, 0.12);
  --control: #1b1e25;
}

* {
  box-sizing: border-box;
}

button, input, select {
  font: inherit;
}

button {
  cursor: pointer;
  border: 1px solid var(--line);
  color: var(--text);
  background: var(--control);
  border-radius: 7px;
  padding: 5px 10px;
}

button:hover:not(:disabled) {
  background: var(--settings-hover);
}

button:disabled {
  opacity: 0.45;
  cursor: default;
}

#player {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

#danmaku {
  position: absolute;
  inset: 8px 0 50px 0;
  pointer-events: none;
  overflow: hidden;
  contain: layout style;
}

#player.tcd-controls-hidden #danmaku {
  bottom: 8px;
}

#danmaku .bullet {
  position: absolute;
  left: 0;
  width: max-content;
  display: inline-flex;
  align-items: center;
  gap: 0.22em;
  padding: 0 6px;
  border-radius: 5px;
  white-space: nowrap;
  font-size: var(--danmaku-font-size, 22px);
  font-weight: var(--danmaku-font-weight, 400);
  line-height: var(--danmaku-line-height, 1.35);
  color: var(--danmaku-fallback-color, #ffffff);
  transform: translate3d(var(--from-x, 100vw), var(--jitter-y, 0px), 0);
  animation-name: tcd-fly;
  animation-duration: var(--fly-duration, 9s);
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  will-change: transform;
  user-select: none;
  overflow: visible;
  text-shadow: 1px 1px 3px #000, 0 0 3px #000;
}

#danmaku[data-stroke="standard"] .bullet {
  text-shadow: 1px 1px 3px #000, 0 0 3px #000;
}

#danmaku[data-stroke="strong"] .bullet {
  text-shadow:
    1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    0 1px 3px #000, 0 -1px 3px #000, 1px 0 3px #000, -1px 0 3px #000;
}

#danmaku[data-stroke="soft"] .bullet {
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.85);
}

#danmaku[data-platform-colors="true"] .bullet {
  color: var(--danmaku-native-color, var(--danmaku-fallback-color, #ffffff));
}

#danmaku[data-actions="true"] .bullet {
  pointer-events: auto;
  cursor: pointer;
}

#danmaku[data-actions="false"] .bullet {
  pointer-events: none;
}

/* Platform source badge (toggleable live via data-platform-badge) */
.platform-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35em;
  height: 1.25em;
  padding: 0 0.34em;
  border-radius: 999px;
  font-size: 0.62em;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  vertical-align: middle;
  text-shadow: none !important;
  flex-shrink: 0;
}

.platform-badge[data-plat="bilibili"] {
  background: rgba(251, 114, 153, 0.22);
  color: #ff9ab7;
  border: 1px solid rgba(251, 114, 153, 0.55);
}

.platform-badge[data-plat="kick"] {
  background: rgba(83, 252, 24, 0.16);
  color: #82ff55;
  border: 1px solid rgba(83, 252, 24, 0.5);
}

.platform-badge[data-plat="douyin"] {
  background: rgba(37, 244, 238, 0.16);
  color: #79fbf6;
  border: 1px solid rgba(37, 244, 238, 0.5);
}

#danmaku[data-platform-badge="false"] .platform-badge {
  display: none;
}

@keyframes tcd-fly {
  from {
    transform: translate3d(var(--from-x, 100vw), var(--jitter-y, 0px), 0);
  }
  to {
    transform: translate3d(var(--to-x, -100%), var(--jitter-y, 0px), 0);
  }
}

.paused #danmaku .bullet,
#danmaku .bullet.danmaku-held {
  animation-play-state: paused !important;
}

#danmaku .bullet.danmaku-selected {
  width: max-content;
  background: rgba(16, 24, 36, 0.84);
  border-radius: 5px;
  padding: 0 6px;
  outline: 1.5px solid rgba(255, 255, 255, 0.8);
  z-index: 50 !important;
}

#danmaku .bullet:focus-visible {
  outline: 2px solid #ffffff;
}

#danmaku .bullet.is-self {
  border: 1.5px solid #66d9ef;
  border-radius: 4px;
  padding: 0 7px;
  background: rgba(16, 28, 42, 0.35);
}

.bullet-user {
  opacity: 0.88;
  margin-right: 0.25em;
  font-size: 0.9em;
}

.bullet-text {
  display: inline-flex;
  align-items: center;
  gap: 0.1em;
}

.chat-emote {
  display: inline-block;
  height: var(--danmaku-emote-size, 1.5em);
  width: auto;
  max-width: 7em;
  object-fit: contain;
  vertical-align: middle;
  margin: 0 0.06em;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6));
}

.chat-gif {
  display: inline-block;
  height: var(--danmaku-gif-size, 2.7em);
  width: auto;
  max-width: 10em;
  border-radius: 5px;
  object-fit: contain;
  vertical-align: middle;
  margin: 0 0.1em;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.75));
}

.tcd-emote-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

.tcd-emote-zw {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0 !important;
  pointer-events: none;
}

.repeat-count {
  display: inline-block;
  color: var(--a);
  font-size: 0.78em;
  font-weight: 800;
  margin-left: 0.25em;
  vertical-align: baseline;
}

/* Hover Lane-Hold Action Menu */
.chat-action-menu {
  position: absolute;
  z-index: 60;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding: 5px;
  max-width: min(440px, calc(100% - 16px));
  pointer-events: auto;
  color: var(--text);
  background: var(--settings-panel);
  border: 1px solid var(--settings-line);
  border-radius: 10px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
}

.chat-action-menu[hidden] {
  display: none;
}

.chat-action-menu button {
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 5px 9px;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.chat-action-menu button:hover:not(:disabled) {
  background: var(--a-soft);
  color: var(--a);
}

.chat-action-status {
  flex-basis: 100%;
  font-size: 11px;
  line-height: 1.45;
  padding: 2px 8px 3px;
  color: var(--muted);
  overflow-wrap: anywhere;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-action-status:empty {
  display: none;
}

/* Floating Quick Trigger */
#tcdFloatingTrigger {
  position: absolute;
  bottom: 56px;
  right: 14px;
  z-index: 45;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 9px;
  background: rgba(16, 16, 19, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.22s ease;
}

#tcdFloatingTrigger[hidden] {
  display: none !important;
}

#player.tcd-show-trigger #tcdFloatingTrigger,
#tcdFloatingTrigger:hover,
#tcdFloatingTrigger:focus-within,
#tcdFloatingTrigger[data-open="true"] {
  opacity: 1;
}

#tcdFloatingTrigger #tcdHideTriggerBtn {
  width: 24px;
  padding: 0;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: var(--muted);
}

#tcdFloatingTrigger #tcdHideTriggerBtn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

#tcdFloatingTrigger button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #e6edf3;
  font-size: 12px;
  font-weight: 600;
}

#tcdFloatingTrigger button:hover {
  background: var(--a-soft);
  color: var(--a);
}

#tcdFloatingTrigger button[aria-pressed="true"] {
  color: var(--a);
}

.tcd-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tcd-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #485060;
  transition: background 0.2s, box-shadow 0.2s;
}

.tcd-dot[data-state="connected"][data-plat="bilibili"] { background: var(--bili); box-shadow: 0 0 6px var(--bili); }
.tcd-dot[data-state="connected"][data-plat="kick"] { background: var(--kick); box-shadow: 0 0 6px var(--kick); }
.tcd-dot[data-state="connected"][data-plat="douyin"] { background: var(--douyin); box-shadow: 0 0 6px var(--douyin); }
.tcd-dot[data-state="connecting"],
.tcd-dot[data-state="reconnecting"] { background: #f59e0b; }
.tcd-dot[data-state="error"] { background: #ef4444; }

/* Settings Panel */
.danmaku-settings {
  position: absolute;
  right: 14px;
  bottom: 92px;
  z-index: 70;
  width: 390px;
  max-width: calc(100% - 28px);
  max-height: calc(100% - 108px);
  padding: 14px;
  background: var(--settings-panel);
  color: var(--settings-ink);
  border: 1px solid var(--settings-line);
  border-radius: 14px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.72);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  text-align: left;
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.danmaku-settings[hidden] {
  display: none;
}

.danmaku-settings-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
}

.danmaku-settings-heading strong {
  font-size: 15px;
  color: #fff;
}

.danmaku-settings-heading span {
  font-size: 11px;
  color: var(--a);
  margin-left: 6px;
  font-weight: 600;
}

.danmaku-settings-heading button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
}

.danmaku-settings-heading button:hover {
  background: var(--settings-hover);
  color: #fff;
}

.danmaku-sliders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin-bottom: 10px;
}

.danmaku-control {
  min-width: 0;
}

.danmaku-settings label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  line-height: 20px;
  gap: 8px;
  color: var(--settings-ink);
}

.danmaku-settings output {
  color: var(--a);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.danmaku-settings input[type="range"] {
  display: block;
  width: 100%;
  height: 22px;
  margin: 2px 0;
  accent-color: var(--a);
  cursor: pointer;
}

.danmaku-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
  margin: 4px 0;
}

.danmaku-setting-row select {
  min-width: 124px;
  max-width: 165px;
  padding: 4px 8px;
  font-size: 12px;
  background: var(--settings-control);
  color: var(--settings-ink);
  border: 1px solid var(--settings-line);
  border-radius: 8px;
}

.danmaku-toggles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  padding: 10px 0;
  margin: 8px 0;
  border-top: 1px solid var(--settings-line);
  border-bottom: 1px solid var(--settings-line);
}

.danmaku-toggles label {
  justify-content: flex-start;
  gap: 7px;
  cursor: pointer;
  font-size: 12px;
}

.danmaku-toggles .tcd-span-2 {
  grid-column: 1 / -1;
}

.danmaku-toggles label.is-disabled,
.merge-setting.is-disabled {
  opacity: 0.5;
}

.danmaku-toggles input[type="checkbox"] {
  accent-color: var(--a);
  width: 14px;
  height: 14px;
  margin: 0;
}

.danmaku-tool-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 10px 0;
}

.danmaku-tool-actions .tcd-span-2 {
  grid-column: 1 / -1;
}

.danmaku-tool-actions button {
  min-height: 30px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--settings-control);
  color: var(--settings-ink);
  border: 1px solid var(--settings-line);
}

.danmaku-tool-actions button:hover {
  background: var(--settings-hover);
  border-color: var(--a-border);
}

.danmaku-settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--settings-line);
  padding-top: 10px;
  margin-top: 8px;
}

.danmaku-settings-footer small {
  font-size: 11px;
  color: var(--muted);
}

#resetDanmakuStyle {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--settings-line);
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 7px;
}

#resetDanmakuStyle:hover {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(239, 68, 68, 0.14);
}

/* Sub-modals inside Shadow DOM */
.tcd-modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 85;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 8, 14, 0.68);
  pointer-events: auto;
  padding: 16px;
}

.tcd-modal-backdrop[hidden] {
  display: none;
}

.tcd-modal {
  width: min(490px, 100%);
  max-height: min(84vh, 100%);
  overflow: auto;
  padding: 18px 20px;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--settings-line);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
}

.tcd-modal h2 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #fff;
}

.tcd-modal p,
.tcd-modal small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.tcd-modal input[type="text"],
.tcd-modal select {
  background: var(--control);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 7px 9px;
  font-size: 12px;
}

.tcd-modal .dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.tcd-modal .primary {
  background: var(--a);
  color: #0d1608;
  border: 0;
  font-weight: 700;
}

.tcd-modal .primary:hover {
  filter: brightness(1.08);
  background: var(--a);
}

/* Tri-platform Rooms Dialog */
.tcd-preset-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
}

.tcd-preset-bar select {
  flex: 1;
  min-width: 0;
}

.tcd-room-rows {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.tcd-room-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  border-radius: 10px;
  background: #161920;
  border: 1px solid var(--line);
}

.tcd-room-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 78px;
}

.tcd-room-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.tcd-room-input-wrap input {
  width: 100%;
}

.tcd-room-status {
  font-size: 11px;
  color: var(--muted);
}

/* Color settings */
.danmaku-colors-dialog .platform-color-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 8px;
  font-size: 13px;
}

.danmaku-colors-dialog .color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 12px;
}

.danmaku-colors-dialog input[type="color"] {
  width: 44px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--control);
  cursor: pointer;
}

/* Keywords & Repeat Rules */
.keyword-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 10px 0;
}

#blockedKeywords {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.keyword-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 10px;
  background: rgba(83, 252, 24, 0.08);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
}

.keyword-chip button {
  border: 0;
  background: transparent;
  padding: 0;
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 1;
  color: var(--muted);
}

.keyword-chip button:hover {
  color: #fff;
  background: var(--settings-hover);
}

#addKeyword {
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 18px;
  color: var(--a);
  border-style: dashed;
}

#addKeyword[hidden],
#keywordEditor[hidden] {
  display: none;
}

#keywordEditor {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

#keywordEditor input {
  flex: 1;
  min-width: 0;
}

#keywordStatus {
  min-height: 16px;
  margin-top: 6px;
  font-size: 12px;
  color: #fca5a5;
}

.merge-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.merge-sub-setting {
  margin-top: 8px;
  padding-top: 0;
  border-top: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--muted);
}

/* Blocked users */
.block-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.block-add input {
  flex: 1;
  min-width: 0;
}

#blockStatus {
  min-height: 16px;
  margin: 8px 0;
  font-size: 12px;
  color: var(--a);
}

#blockedList {
  max-height: 32vh;
  overflow: auto;
}

.blocked-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}

.blocked-row button {
  font-size: 11px;
  padding: 3px 8px;
}

/* Avoidance Editor */
#avoidanceEditor {
  position: absolute;
  z-index: 65;
  touch-action: none;
  cursor: crosshair;
  background: rgba(83, 252, 24, 0.05);
  pointer-events: auto;
}

#avoidanceEditor[hidden] {
  display: none;
}

.avoidance-actions {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
  background: var(--settings-panel);
  color: var(--text);
  border: 1px solid var(--settings-line);
  border-radius: 10px;
  padding: 7px 10px;
  max-width: 95%;
  z-index: 2;
  cursor: default;
}

.avoidance-actions span {
  font-size: 12px;
  white-space: nowrap;
}

.avoidance-region {
  position: absolute;
  border: 2px dashed var(--a);
  border-radius: 8px;
  background: rgba(83, 252, 24, 0.16);
  cursor: move;
}

.avoidance-region button {
  position: absolute;
  right: 3px;
  top: 3px;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  background: var(--panel);
  color: var(--text);
}

.avoidance-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  border-right: 3px solid var(--a);
  border-bottom: 3px solid var(--a);
  border-radius: 0 0 6px 0;
}

/* Unified Tri-Platform Quick Send Bar */
#tcdSendBar {
  position: absolute;
  left: 50%;
  bottom: 98px;
  transform: translateX(-50%);
  z-index: 75;
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(560px, calc(100% - 24px));
  padding: 6px 9px;
  background: rgba(16, 16, 19, 0.94);
  border: 1px solid var(--settings-line);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

#tcdSendBar[hidden] {
  display: none;
}

.tcd-send-targets {
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
}

.tcd-target-btn {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--control);
  color: var(--muted);
}

.tcd-target-btn.active[data-target="bilibili"] {
  background: rgba(251, 114, 153, 0.22);
  border-color: var(--bili);
  color: #ffb0c7;
}

.tcd-target-btn.active[data-target="kick"] {
  background: rgba(83, 252, 24, 0.18);
  border-color: var(--kick);
  color: #93ff6a;
}

.tcd-target-btn.active[data-target="douyin"] {
  background: rgba(37, 244, 238, 0.18);
  border-color: var(--douyin);
  color: #84fcf7;
}

#tcdReplyBadge {
  font-size: 11px;
  color: var(--a);
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

#tcdReplyBadge[hidden] {
  display: none;
}

#tcdSendInput {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: #1a1d24;
  color: #fff;
  font-size: 13px;
}

#tcdSendInput:focus {
  outline: 1.5px solid var(--a);
  border-color: var(--a);
}

#tcdSendSubmit {
  background: var(--a);
  color: #0d1608;
  border: 0;
  font-weight: 700;
  padding: 6px 12px;
  flex-shrink: 0;
}

#tcdSendClose {
  padding: 4px 7px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
}

/* Main-Interface Collapsible 3-Platform Live Chat Feed */
#tcdChatFeed {
  position: absolute;
  left: 14px;
  bottom: 152px;
  z-index: 68;
  width: 320px;
  height: min(360px, calc(100% - 170px));
  max-width: calc(100% - 28px);
  display: flex;
  flex-direction: column;
  background: rgba(16, 16, 19, 0.88);
  color: var(--settings-ink);
  border: 1px solid var(--settings-line);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  pointer-events: auto;
  overflow: hidden;
  user-select: text;
}

#tcdChatFeed[hidden] {
  display: none;
}

#tcdChatFeed[data-platform-badge="false"] .platform-badge {
  display: none;
}

#tcdChatFeedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--settings-line);
  background: rgba(255, 255, 255, 0.03);
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.tcd-feed-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.tcd-feed-title strong {
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
}

.tcd-feed-filters {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tcd-feed-filter {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
}

.tcd-feed-filter.active {
  background: var(--a-soft);
  border-color: var(--a-border);
  color: var(--a);
}

.tcd-feed-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

#tcdFeedClearBtn,
#tcdFeedCloseBtn {
  padding: 2px 6px;
  font-size: 11px;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 5px;
}

#tcdFeedCloseBtn {
  font-size: 16px;
  line-height: 1;
}

#tcdChatFeedList {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

#tcdChatFeedEmpty {
  margin: auto;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  padding: 18px 8px;
}

.tcd-feed-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.45;
  background: rgba(255, 255, 255, 0.03);
}

.tcd-feed-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tcd-feed-item.is-self {
  border-left: 2px solid #66d9ef;
  background: rgba(16, 28, 42, 0.45);
}

.tcd-feed-main {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tcd-feed-main .platform-badge {
  margin-right: 5px;
  font-size: 10px;
  height: 15px;
  vertical-align: text-top;
}

.tcd-feed-user {
  font-weight: 600;
  color: #cbd5e1;
  margin-right: 4px;
}

.tcd-feed-item[data-plat="bilibili"] .tcd-feed-user { color: #ffadc6; }
.tcd-feed-item[data-plat="kick"] .tcd-feed-user { color: #9eff7a; }
.tcd-feed-item[data-plat="douyin"] .tcd-feed-user { color: #8af8f4; }

.tcd-feed-main .bullet-text {
  display: inline;
  color: #f8fafc;
}

.tcd-feed-main .chat-emote {
  height: 1.35em;
  max-width: 5em;
}

.tcd-feed-main .chat-gif {
  height: 2.1em;
  max-width: 7em;
}

.tcd-feed-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}

.tcd-feed-item:hover .tcd-feed-actions,
.tcd-feed-item:focus-within .tcd-feed-actions {
  opacity: 1;
}

.tcd-feed-actions button {
  padding: 1px 5px;
  font-size: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(16, 16, 19, 0.85);
  color: #e2e8f0;
}

.tcd-feed-actions button:hover {
  border-color: var(--a);
  color: var(--a);
}

#tcdChatFeedList[data-active-filter="bilibili"] .tcd-feed-item:not([data-plat="bilibili"]),
#tcdChatFeedList[data-active-filter="kick"] .tcd-feed-item:not([data-plat="kick"]),
#tcdChatFeedList[data-active-filter="douyin"] .tcd-feed-item:not([data-plat="douyin"]) {
  display: none;
}

.tcd-feed-footer {
  padding: 6px 8px;
  border-top: 1px solid var(--settings-line);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

#tcdFeedOpenSendBtn {
  width: 100%;
  font-size: 12px;
  padding: 5px 8px;
  text-align: center;
}

.tcd-rooms-subtip {
  margin: 0 0 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(83, 252, 24, 0.08);
  border: 1px solid var(--a-border);
  color: #dbe4ef !important;
  font-size: 11.5px !important;
  line-height: 1.5;
}

/* First-visit anti-ghosting onboarding tip & update notification card */
#tcdOnboardingTip,
#tcdUpdateTip {
  position: absolute;
  right: 14px;
  bottom: 96px;
  z-index: 72;
  width: min(360px, calc(100% - 28px));
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(16, 16, 19, 0.95);
  color: var(--settings-ink);
  border: 1px solid var(--a-border);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

#tcdOnboardingTip[hidden],
#tcdUpdateTip[hidden] {
  display: none;
}

.tcd-tip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.tcd-tip-head strong {
  font-size: 13px;
  color: #fff;
}

#tcdTipCloseX,
#tcdUpdateCloseX {
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 0 4px;
  font-size: 16px;
  line-height: 1;
}

#tcdOnboardingBody,
#tcdUpdateBody {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.55;
  color: #cbd5e1;
}

.tcd-tip-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tcd-tip-actions button {
  font-size: 12px;
  padding: 5px 10px;
}

.tcd-tip-actions .primary {
  background: var(--a);
  color: #0d1608;
  border: 0;
  font-weight: 700;
}

/* Toast inside player */
#tcdToast {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 95;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  background: rgba(16, 16, 19, 0.94);
  color: #edf2f8;
  border: 1px solid var(--settings-line);
  border-radius: 9px;
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
  pointer-events: auto;
  max-width: min(480px, calc(100% - 32px));
}

#tcdToast.error {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.45);
}

#tcdToast[hidden] {
  display: none;
}

.tcd-toast-action {
  padding: 2px 8px;
  font-size: 11px;
  background: var(--a);
  color: #0d1608;
  border: 0;
  font-weight: 700;
  border-radius: 6px;
}

@media (max-width: 768px), (max-height: 500px) {
  #tcdFloatingTrigger {
    bottom: 44px;
    right: 8px;
    gap: 2px;
    padding: 3px;
  }

  #tcdFloatingTrigger button {
    height: 26px;
    padding: 0 6px;
    font-size: 11px;
  }

  .danmaku-settings {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: 10px;
    width: auto;
    max-width: none;
    max-height: 76dvh;
    z-index: 2147483646;
  }

  #tcdSendBar {
    width: calc(100% - 16px);
    bottom: 12px;
    flex-wrap: wrap;
  }

  #tcdChatFeed {
    left: 8px;
    bottom: 118px;
    width: min(290px, calc(100% - 16px));
    height: min(260px, calc(100% - 134px));
  }
}
`;

  return { SHADOW_CSS };
});
