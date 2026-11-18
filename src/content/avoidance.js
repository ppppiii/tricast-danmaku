(function (root, factory) {
  const api = factory(root.__TCD__?.state);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.__TCD__ = root.__TCD__ || {};
  root.__TCD__.avoidance = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (stateMod) {
  'use strict';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function visible(width, height, holes) {
    const xs = [
      ...new Set([
        0,
        width,
        ...holes.flatMap((r) => [clamp(r.x, 0, width), clamp(r.x + r.w, 0, width)]),
      ]),
    ].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const x = xs[i];
      const right = xs[i + 1];
      if (right <= x) continue;
      const cut = holes
        .filter((r) => r.x < right && r.x + r.w > x)
        .map((r) => [clamp(r.y, 0, height), clamp(r.y + r.h, 0, height)])
        .sort((a, b) => a[0] - b[0]);
      let y = 0;
      for (const [a, b] of cut) {
        if (a > y) out.push({ x, y, w: right - x, h: a - y });
        y = Math.max(y, b);
      }
      if (y < height) out.push({ x, y, w: right - x, h: height - y });
    }
    return out;
  }

  function createAvoidance(options = {}) {
    const {
      shadowRoot = null,
      stateApi = stateMod,
      onMaskChange = () => {},
      onNotice = () => {},
    } = options;

    const $ = (id) => shadowRoot?.getElementById(id) || null;
    const storageKey = stateApi?.STORAGE_KEYS?.avoidance || 'tcd_avoidance_v1';
    const player = $('player');
    const overlay = $('danmaku');

    let regions = [];
    let editing = false;
    let drag = null;

    function parseRegions(v) {
      if (!Array.isArray(v)) return [];
      return v
        .filter((r) => r && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k])))
        .slice(0, 8)
        .map((r) => {
          const x = clamp(r.x, 0, 0.98);
          const y = clamp(r.y, 0, 0.98);
          return {
            x,
            y,
            w: clamp(r.w, 0.02, 1 - x),
            h: clamp(r.h, 0.02, 1 - y),
          };
        });
    }

    async function load() {
      const saved = await stateApi?.readData(storageKey, []);
      regions = parseRegions(saved);
      onMaskChange();
      if (editing) render();
    }

    stateApi?.onDataChange?.(storageKey, (val) => {
      regions = parseRegions(val);
      onMaskChange();
      if (editing) render();
    });

    function persist() {
      stateApi?.writeData(storageKey, regions);
      onMaskChange();
    }

    let editor = null;
    let clearBtn = null;
    let doneBtn = null;

    function ensureEditor() {
      if (!player || !overlay || editor) return;
      const doc = player.ownerDocument || document;
      editor = doc.createElement('div');
      editor.id = 'avoidanceEditor';
      editor.hidden = true;
      const actions = doc.createElement('div');
      actions.className = 'avoidance-actions';
      const hint = doc.createElement('span');
      hint.textContent = '拖出避让区 · 拖动移动 · 右下角缩放';
      clearBtn = doc.createElement('button');
      clearBtn.type = 'button';
      clearBtn.textContent = '清空';
      doneBtn = doc.createElement('button');
      doneBtn.type = 'button';
      doneBtn.textContent = '完成';
      actions.append(hint, clearBtn, doneBtn);
      editor.append(actions);
      player.append(editor);

      const point = (e) => {
        const r = editor.getBoundingClientRect();
        return {
          x: clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1),
          y: clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1),
        };
      };

      editor.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button,.avoidance-actions')) return;
        const p = point(e);
        const box = e.target.closest('.avoidance-region');
        if (!box && regions.length >= 8) {
          onNotice('最多设置 8 个避让区');
          return;
        }
        const i = box
          ? Number(box.dataset.index)
          : regions.push({ x: p.x, y: p.y, w: 0.02, h: 0.02 }) - 1;
        drag = {
          i,
          start: p,
          initial: { ...regions[i] },
          mode: box
            ? e.target.classList.contains('avoidance-resize')
              ? 'resize'
              : 'move'
            : 'new',
        };
        try {
          editor.setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
        render();
      });

      editor.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const p = point(e);
        const d = drag;
        const r = regions[d.i];
        const dx = p.x - d.start.x;
        const dy = p.y - d.start.y;
        if (d.mode === 'move') {
          r.x = clamp(d.initial.x + dx, 0, 1 - r.w);
          r.y = clamp(d.initial.y + dy, 0, 1 - r.h);
        } else if (d.mode === 'resize') {
          r.w = clamp(d.initial.w + dx, 0.02, 1 - r.x);
          r.h = clamp(d.initial.h + dy, 0.02, 1 - r.y);
        } else {
          r.x = Math.min(p.x, d.start.x);
          r.y = Math.min(p.y, d.start.y);
          r.w = Math.max(0.005, Math.abs(dx));
          r.h = Math.max(0.005, Math.abs(dy));
        }
        render();
        onMaskChange();
      });

      const finish = () => {
        if (!drag) return;
        const r = regions[drag.i];
        if (r && (r.w < 0.02 || r.h < 0.02)) {
          regions.splice(drag.i, 1);
        }
        drag = null;
        render();
        persist();
      };

      editor.addEventListener('pointerup', finish);
      editor.addEventListener('pointercancel', finish);
      clearBtn.onclick = () => {
        regions = [];
        render();
        persist();
      };
      doneBtn.onclick = () => setEditing(false);

      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(() => {
          if (editing) layout();
          onMaskChange();
        }).observe(overlay);
      }
    }

    function render() {
      if (!editor) return;
      const doc = editor.ownerDocument || document;
      editor.querySelectorAll('.avoidance-region').forEach((e) => e.remove());
      regions.forEach((r, i) => {
        const el = doc.createElement('div');
        el.className = 'avoidance-region';
        el.dataset.index = String(i);
        Object.assign(el.style, {
          left: r.x * 100 + '%',
          top: r.y * 100 + '%',
          width: r.w * 100 + '%',
          height: r.h * 100 + '%',
        });
        const remove = doc.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = '删除避让区';
        remove.addEventListener('pointerdown', (e) => e.stopPropagation());
        remove.onclick = () => {
          regions.splice(i, 1);
          render();
          persist();
        };
        const resize = doc.createElement('span');
        resize.className = 'avoidance-resize';
        el.append(remove, resize);
        editor.append(el);
      });
    }

    function layout() {
      if (!editor || !overlay || !player) return;
      const r = overlay.getBoundingClientRect();
      const p = player.getBoundingClientRect();
      Object.assign(editor.style, {
        left: r.left - p.left + 'px',
        top: r.top - p.top + 'px',
        width: r.width + 'px',
        height: r.height + 'px',
      });
    }

    function setEditing(value) {
      ensureEditor();
      if (!editor || !player) return;
      editing = Boolean(value);
      editor.hidden = !editing;
      player.classList.toggle('editing-avoidance', editing);
      if (editing) {
        const panel = $('danmakuSettings');
        if (panel) panel.hidden = true;
        layout();
        render();
      }
    }

    $('avoidanceButton')?.addEventListener('click', () => setEditing(!editing));
    if (typeof document !== 'undefined') {
      document.addEventListener(
        'keydown',
        (e) => {
          if (editing && e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
          }
        },
        true,
      );
    }

    load();

    return {
      regions: () => regions.map((r) => ({ ...r })),
      rects: (w, h) => regions.map((r) => ({ x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h })),
      visible,
      setEditing,
      isEditing: () => editing,
      setRegions: (next) => {
        regions = parseRegions(next);
        persist();
      },
    };
  }

  return { createAvoidance, visible };
});
