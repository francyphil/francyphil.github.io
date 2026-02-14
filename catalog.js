/**
 * catalog.js — Logica comune per le pagine catalogo (Regno, Trieste A, Libia, …).
 *
 * Uso: nella pagina HTML definire un oggetto CATALOG_CONFIG prima di includere questo script:
 *
 *   <script>
 *     var CATALOG_CONFIG = {
 *       jsonFile: "targhetteRegno.json",
 *       // Funzione che, dato un record, ritorna il path dell'immagine preview
 *       getImgPath: function(r) {
 *         return `jpg/prev_${r["Targhetta Ufficio"]}${(r["extra"]) ? ('_' + (r["extra"]).toString().trim()) : ''}.jpeg`;
 *       },
 *       // (opzionale) Funzione extra per personalizzare le celle della tabella.
 *       // Riceve (td, campo, valore, record). Ritorna true se ha gestito la cella,
 *       // false per usare il comportamento di default.
 *       customCell: function(td, campo, val, record) { ... }
 *     };
 *   </script>
 *   <script src="/catalog.js"></script>
 */

(function () {
  "use strict";

  const CFG = window.CATALOG_CONFIG || {};
  if (!CFG.jsonFile) {
    console.error("CATALOG_CONFIG.jsonFile non definito");
    return;
  }
  if (!CFG.getImgPath) {
    console.error("CATALOG_CONFIG.getImgPath non definito");
    return;
  }

  let data = [],
    immagini = [],
    lightboxIndex = 0,
    currentPage = 1;

  // ── Utilità ──────────────────────────────────────────────────────────

  function getCampi() {
    return Array.from(document.querySelectorAll("#trTitoli th")).map(
      (th) => th.dataset.campo,
    );
  }

  function isMobile() {
    return Math.min(window.innerWidth, window.innerHeight) <= 500;
  }

  function smartSort(a, b) {
    const na = Number(a),
      nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), "it");
  }

  // ── Caricamento JSON ─────────────────────────────────────────────────

  fetch(CFG.jsonFile)
    .then((res) => res.json())
    .then((json) => {
      data = json;
      calcolaLarghezzeFisse(data);
      costruisciFiltri(data);
      costruisciFiltriMobile(data);
      aggiornaVisualizzazione(data);
      window.addEventListener("resize", () => {
        calcolaLarghezzeFisse(data);
        aggiornaVisualizzazione(filtraDati(data));
      });
    })
    .catch(() => {
      /* se non esiste JSON, lasciare pagina vuota */
    });

  // ── Multi-select ─────────────────────────────────────────────────────

  function creaMultiSelect(campo, valoriOrdinati, onChange) {
    const wrapper = document.createElement("div");
    wrapper.className = "multi-select";
    wrapper.dataset.campo = campo;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "multi-select-btn";
    btn.innerHTML =
      '<span class="ms-label">Tutti</span><span class="ms-arrow">▼</span>';

    const panel = document.createElement("div");
    panel.className = "multi-select-panel";

    // Barra di ricerca
    const search = document.createElement("input");
    search.type = "text";
    search.className = "ms-search";
    search.placeholder = "Cerca…";
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      panel.querySelectorAll("label.ms-option").forEach((lbl) => {
        lbl.classList.toggle(
          "ms-hidden",
          q && !lbl.textContent.toLowerCase().includes(q),
        );
      });
    });
    panel.appendChild(search);

    // Azioni: seleziona tutto / deseleziona tutto
    const actions = document.createElement("div");
    actions.className = "ms-actions";
    const btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.textContent = "Tutti";
    btnAll.addEventListener("click", () => {
      panel
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) => (cb.checked = true));
      aggiornaMultiSelectLabel(wrapper);
      onChange();
    });
    const btnNone = document.createElement("button");
    btnNone.type = "button";
    btnNone.textContent = "Nessuno";
    btnNone.addEventListener("click", () => {
      panel
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) => (cb.checked = false));
      aggiornaMultiSelectLabel(wrapper);
      onChange();
    });
    actions.appendChild(btnAll);
    actions.appendChild(btnNone);
    panel.appendChild(actions);

    // Checkbox per ogni valore
    valoriOrdinati.forEach((v) => {
      const lbl = document.createElement("label");
      lbl.className = "ms-option";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = v;
      cb.addEventListener("change", () => {
        aggiornaMultiSelectLabel(wrapper);
        onChange();
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(String(v)));
      panel.appendChild(lbl);
    });

    wrapper.appendChild(btn);
    document.body.appendChild(panel);
    wrapper._panel = panel;

    function posizionaPannello() {
      const rect = btn.getBoundingClientRect();
      panel.style.top = rect.bottom + "px";
      panel.style.left = rect.left + "px";
      panel.style.minWidth = Math.max(200, rect.width) + "px";
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".multi-select-panel.open").forEach((p) => {
        if (p !== panel) p.classList.remove("open");
      });
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        posizionaPannello();
        search.value = "";
        search.dispatchEvent(new Event("input"));
        search.focus();
      }
    });

    window.addEventListener(
      "scroll",
      () => {
        if (panel.classList.contains("open")) posizionaPannello();
      },
      true,
    );
    window.addEventListener("resize", () => {
      if (panel.classList.contains("open")) posizionaPannello();
    });

    return wrapper;
  }

  function aggiornaMultiSelectLabel(wrapper) {
    const btn = wrapper.querySelector(".ms-label");
    const panel =
      wrapper._panel || wrapper.querySelector(".multi-select-panel");
    if (!panel) return;
    const checkboxes = panel.querySelectorAll(
      ".ms-option input[type=checkbox]",
    );
    const checked = Array.from(checkboxes).filter((cb) => cb.checked);
    const btnEl = wrapper.querySelector(".multi-select-btn");
    if (checked.length === 0 || checked.length === checkboxes.length) {
      btn.textContent = "Tutti";
      btnEl.classList.remove("has-selection");
    } else if (checked.length === 1) {
      btn.textContent = checked[0].value;
      btnEl.classList.add("has-selection");
    } else {
      btn.textContent = checked.length + " selezionati";
      btnEl.classList.add("has-selection");
    }
  }

  function getMultiSelectValues(wrapper) {
    const panel =
      wrapper._panel || wrapper.querySelector(".multi-select-panel");
    if (!panel) return [];
    const checkboxes = panel.querySelectorAll(
      ".ms-option input[type=checkbox]",
    );
    const checked = Array.from(checkboxes).filter((cb) => cb.checked);
    if (checked.length === 0 || checked.length === checkboxes.length) return [];
    return checked.map((cb) => cb.value);
  }

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".multi-select") &&
      !e.target.closest(".multi-select-panel")
    ) {
      document
        .querySelectorAll(".multi-select-panel.open")
        .forEach((p) => p.classList.remove("open"));
    }
  });

  // ── Larghezze colonne ────────────────────────────────────────────────

  function calcolaLarghezzeFisse(records) {
    if (isMobile()) return;
    const campi = getCampi();
    const thList = document.querySelectorAll("#trTitoli th");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = "14px sans-serif";

    const MIN_WIDTH = 50;
    const PADDING = 30;

    const larghezze = campi.map((campo, i) => {
      let maxW = ctx.measureText(thList[i].textContent).width;
      const campione = records.slice(0, 500);
      campione.forEach((r) => {
        let val = r[campo];
        if (val == null) return;
        if (Array.isArray(val)) val = val.join(", ");
        const w = ctx.measureText(String(val)).width;
        if (w > maxW) maxW = w;
      });
      return Math.max(MIN_WIDTH, Math.ceil(maxW + PADDING));
    });

    const totalWidth = larghezze.reduce((s, w) => s + w, 0);
    thList.forEach((th, i) => {
      th.style.width = ((larghezze[i] / totalWidth) * 100).toFixed(2) + "%";
    });

    document.getElementById("tabellaFiltri").style.width = "100%";
  }

  // ── Filtri desktop ───────────────────────────────────────────────────

  function costruisciFiltri(records) {
    const trFiltri = document.getElementById("trFiltri");
    trFiltri.innerHTML = "";
    if (!records.length) return;

    const campi = getCampi();
    campi.forEach((campo) => {
      const th = document.createElement("th");
      const valori = new Set();
      records.forEach((r) => {
        const v = r[campo];
        if (Array.isArray(v)) v.forEach((x) => valori.add(x));
        else if (v != null) valori.add(v);
      });

      const valoriOrdinati = Array.from(valori).sort(smartSort);
      const ms = creaMultiSelect(campo, valoriOrdinati, () => {
        aggiornaOpzioniFiltri();
        aggiornaVisualizzazione(filtraDati(data));
      });

      th.appendChild(ms);
      trFiltri.appendChild(th);
    });
  }

  // ── Filtri mobile ────────────────────────────────────────────────────

  function costruisciFiltriMobile(records) {
    const panel = document.getElementById("mobileFilterPanel");
    panel.innerHTML = "";
    if (!records.length) return;

    const thList = document.querySelectorAll("#trTitoli th");
    const campi = getCampi();

    campi.forEach((campo, idx) => {
      const valori = new Set();
      records.forEach((r) => {
        const v = r[campo];
        if (Array.isArray(v)) v.forEach((x) => valori.add(x));
        else if (v != null) valori.add(v);
      });
      if (valori.size > 500 || valori.size <= 1) return;

      const fieldLabel = document.createElement("label");
      fieldLabel.textContent = thList[idx].textContent;

      const valoriOrdinati = Array.from(valori).sort(smartSort);
      const ms = creaMultiSelect(campo, valoriOrdinati, () => {
        sincronizzaFiltri(campo, "mobile");
        aggiornaOpzioniFiltri();
        updateFilterBadge();
        aggiornaVisualizzazione(filtraDati(data));
      });

      fieldLabel.appendChild(ms);
      panel.appendChild(fieldLabel);
    });

    // Controlli mobile: Max record + Schema
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "mobile-panel-controls";

    const maxLabel = document.createElement("label");
    maxLabel.textContent = "Max record";
    const maxSelect = document.createElement("select");
    maxSelect.id = "mobileMaxRecords";
    ["100", "200", "500", "all"].forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v === "all" ? "Tutti" : v;
      maxSelect.appendChild(opt);
    });
    maxSelect.addEventListener("change", () => {
      document.getElementById("maxRecords").value = maxSelect.value;
      aggiornaVisualizzazione(filtraDati(data));
    });
    maxLabel.appendChild(maxSelect);
    controlsDiv.appendChild(maxLabel);

    const schemaLabel = document.createElement("label");
    schemaLabel.textContent = "Schema";
    const schemaSelect = document.createElement("select");
    schemaSelect.id = "mobileSchemaCatalogazione";
    [
      { v: "ornaghi_ufficio", t: "Ornaghi Ufficio" },
      { v: "ornaghi_tipo", t: "Ornaghi Tipo" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      schemaSelect.appendChild(opt);
    });
    schemaSelect.addEventListener("change", () => {
      document.getElementById("schemaCatalogazione").value =
        schemaSelect.value;
      aggiornaVisualizzazione(filtraDati(data));
    });
    schemaLabel.appendChild(schemaSelect);
    controlsDiv.appendChild(schemaLabel);
    panel.appendChild(controlsDiv);

    // Pulsante azzera
    const resetBtn = document.createElement("button");
    resetBtn.className = "reset-filters";
    resetBtn.textContent = "Azzera filtri";
    resetBtn.addEventListener("click", () => {
      document.querySelectorAll(".multi-select").forEach((ms) => {
        const p = ms._panel || ms.querySelector(".multi-select-panel");
        if (p)
          p.querySelectorAll(".ms-option input[type=checkbox]").forEach(
            (cb) => (cb.checked = false),
          );
        aggiornaMultiSelectLabel(ms);
      });
      aggiornaOpzioniFiltri();
      updateFilterBadge();
      aggiornaVisualizzazione(filtraDati(data));
    });
    panel.appendChild(resetBtn);
  }

  function toggleMobileFilters() {
    const btn = document.getElementById("mobileFilterToggle");
    const panel = document.getElementById("mobileFilterPanel");
    btn.classList.toggle("open");
    panel.classList.toggle("open");
  }

  function updateFilterBadge() {
    const panel = document.getElementById("mobileFilterPanel");
    const multiSelects = panel.querySelectorAll(".multi-select");
    let activeCount = 0;
    multiSelects.forEach((ms) => {
      if (getMultiSelectValues(ms).length > 0) activeCount++;
    });
    const badge = document.getElementById("filterBadge");
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }
  }

  // ── Sincronizzazione filtri ──────────────────────────────────────────

  function sincronizzaFiltri(campo, sorgente) {
    const desktopMs = document.querySelector(
      `#trFiltri .multi-select[data-campo="${campo}"]`,
    );
    const mobileMs = document.querySelector(
      `#mobileFilterPanel .multi-select[data-campo="${campo}"]`,
    );
    if (!desktopMs || !mobileMs) return;

    const [src, dst] =
      sorgente === "mobile"
        ? [mobileMs, desktopMs]
        : [desktopMs, mobileMs];
    const srcChecked = new Set(getMultiSelectValues(src));

    const dstPanel =
      dst._panel || dst.querySelector(".multi-select-panel");
    if (!dstPanel) return;
    dstPanel
      .querySelectorAll(".ms-option input[type=checkbox]")
      .forEach((cb) => {
        cb.checked = srcChecked.has(cb.value);
      });
    aggiornaMultiSelectLabel(dst);
  }

  // ── Filtraggio dati ──────────────────────────────────────────────────

  function filtraDati(records) {
    const multiSelects = document.querySelectorAll(
      "#trFiltri .multi-select",
    );
    const filtri = {};
    multiSelects.forEach((ms) => {
      const vals = getMultiSelectValues(ms);
      if (vals.length > 0) filtri[ms.dataset.campo] = vals;
    });
    return records.filter((r) => {
      for (const [campo, valoriAccettati] of Object.entries(filtri)) {
        const val = r[campo];
        if (Array.isArray(val)) {
          if (!val.some((v) => valoriAccettati.includes(String(v))))
            return false;
        } else {
          if (!valoriAccettati.includes(String(val))) return false;
        }
      }
      return true;
    });
  }

  // ── Aggiorna opzioni filtri a cascata ────────────────────────────────

  function aggiornaOpzioniFiltri() {
    const desktopMultiSelects = Array.from(
      document.querySelectorAll("#trFiltri .multi-select"),
    );

    const filtriAttivi = {};
    desktopMultiSelects.forEach((ms) => {
      const vals = getMultiSelectValues(ms);
      if (vals.length > 0) filtriAttivi[ms.dataset.campo] = vals;
    });

    desktopMultiSelects.forEach((ms) => {
      const campo = ms.dataset.campo;

      const recordFiltrati = data.filter((r) => {
        for (const [c, valoriAccettati] of Object.entries(filtriAttivi)) {
          if (c === campo) continue;
          const val = r[c];
          if (Array.isArray(val)) {
            if (!val.some((v) => valoriAccettati.includes(String(v))))
              return false;
          } else {
            if (!valoriAccettati.includes(String(val))) return false;
          }
        }
        return true;
      });

      const valoriPossibili = new Set();
      recordFiltrati.forEach((r) => {
        const v = r[campo];
        if (Array.isArray(v))
          v.forEach((x) => valoriPossibili.add(String(x)));
        else if (v != null) valoriPossibili.add(String(v));
      });

      const msPanel =
        ms._panel || ms.querySelector(".multi-select-panel");
      if (!msPanel) return;
      msPanel.querySelectorAll(".ms-option").forEach((lbl) => {
        const cb = lbl.querySelector("input[type=checkbox]");
        const possibile = valoriPossibili.has(cb.value);
        lbl.style.display = possibile ? "" : "none";
        if (!possibile && cb.checked) {
          cb.checked = false;
        }
      });
      aggiornaMultiSelectLabel(ms);
    });

    // Sincronizza i filtri mobile con quelli desktop
    const mobileMultiSelects = document.querySelectorAll(
      "#mobileFilterPanel .multi-select",
    );
    mobileMultiSelects.forEach((mMs) => {
      const campo = mMs.dataset.campo;
      const dMs = document.querySelector(
        `#trFiltri .multi-select[data-campo="${campo}"]`,
      );
      if (!dMs) return;

      const dPanel =
        dMs._panel || dMs.querySelector(".multi-select-panel");
      if (!dPanel) return;
      const dCheckboxes = dPanel.querySelectorAll(
        ".ms-option input[type=checkbox]",
      );
      const dStates = {};
      const dVisible = {};
      dCheckboxes.forEach((cb) => {
        dStates[cb.value] = cb.checked;
        dVisible[cb.value] = cb.closest(".ms-option").style.display;
      });

      const mPanel =
        mMs._panel || mMs.querySelector(".multi-select-panel");
      if (!mPanel) return;
      mPanel.querySelectorAll(".ms-option").forEach((lbl) => {
        const cb = lbl.querySelector("input[type=checkbox]");
        if (cb.value in dStates) {
          cb.checked = dStates[cb.value];
          lbl.style.display = dVisible[cb.value];
        }
      });
      aggiornaMultiSelectLabel(mMs);
    });
  }

  // ── Schema di catalogazione ──────────────────────────────────────────

  async function applicaSchema(records, vistaSelezionata) {
    const schema = document.getElementById("schemaCatalogazione").value;
    if (schema === "ornaghi_ufficio") {
      return records;
    } else if (schema === "ornaghi_tipo") {
      const gruppi = {};
      records.forEach((r) => {
        const tipo = r["Targhetta Tipo"];
        if (!gruppi[tipo]) gruppi[tipo] = [];
        gruppi[tipo].push(r);
      });

      const soloTabella = vistaSelezionata === "tabella";

      const risultato = [];
      for (const tipo in gruppi) {
        const gruppo = gruppi[tipo];

        if (soloTabella) {
          risultato.push(gruppo[0]);
        } else {
          const verificaImmagine = (record) => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              img.src = CFG.getImgPath(record);
            });
          };

          let recordSelezionato = gruppo[0];
          for (const record of gruppo) {
            const hasImage = await verificaImmagine(record);
            if (hasImage) {
              recordSelezionato = record;
              break;
            }
          }

          risultato.push(recordSelezionato);
        }
      }
      return risultato;
    }
    return records;
  }

  // ── Visualizzazione ──────────────────────────────────────────────────

  async function aggiornaVisualizzazione(records) {
    const loadingIndicator = document.getElementById("loadingIndicator");
    loadingIndicator.style.display = "flex";

    try {
      const vista = document.getElementById("vistaSelezionata").value;

      records = await applicaSchema(records, vista);

      const maxRecords = document.getElementById("maxRecords").value;
      let perPage =
        maxRecords === "all" ? records.length : parseInt(maxRecords);

      const totalPages =
        perPage === 0
          ? 1
          : Math.max(1, Math.ceil(records.length / perPage));
      if (currentPage > totalPages) currentPage = totalPages;

      const start =
        perPage === records.length ? 0 : (currentPage - 1) * perPage;
      const end =
        perPage === records.length ? records.length : start + perPage;
      let mostrati = records.slice(start, end);

      renderPagination(records.length, perPage, currentPage);

      // ===== MOBILE =====
      if (isMobile()) {
        const isLandscape = window.matchMedia(
          "(orientation: landscape)",
        ).matches;

        if (isLandscape) {
          mostraTabella(mostrati);
        } else {
          mostraTabella([]);
          document.getElementById("cardContainer").style.display = "flex";
          mostraCard(mostrati);
        }
        aggiornaGrafico(records);
        return;
      }

      // ===== DESKTOP =====
      const cardContainer = document.getElementById("cardContainer");

      if (vista === "tabella" || vista === "tabella_card") {
        mostraTabella(mostrati);
      } else {
        mostraTabella([]);
      }
      if (vista === "card" || vista === "tabella_card") {
        cardContainer.style.display = "flex";
        mostraCard(mostrati);
      } else cardContainer.style.display = "none";

      aggiornaGrafico(records);
    } finally {
      loadingIndicator.style.display = "none";
    }
  }

  // ── Paginazione ──────────────────────────────────────────────────────

  function renderPagination(totalItems, perPage, page) {
    const container = document.getElementById("pagination");
    container.innerHTML = "";

    if (!perPage || perPage >= totalItems) {
      container.style.display = "none";
      return;
    }
    container.style.display = "flex";

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    const createArrow = (dir) => {
      const btn = document.createElement("button");
      btn.className = "page-arrow";
      btn.textContent = dir === "prev" ? "⟨" : "⟩";
      if (
        (dir === "prev" && page <= 1) ||
        (dir === "next" && page >= totalPages)
      ) {
        btn.classList.add("disabled");
      }
      btn.addEventListener("click", () => {
        if (dir === "prev") prevPage(totalPages);
        else nextPage(totalPages);
      });
      return btn;
    };

    container.appendChild(createArrow("prev"));

    const maxDots = 11;
    let startPage = Math.max(1, page - Math.floor(maxDots / 2));
    let endPage = Math.min(totalPages, startPage + maxDots - 1);
    if (endPage - startPage < maxDots - 1)
      startPage = Math.max(1, endPage - maxDots + 1);

    for (let p = startPage; p <= endPage; p++) {
      const dot = document.createElement("button");
      dot.className = "page-dot" + (p === page ? " active" : "");
      dot.textContent = p;
      dot.addEventListener("click", () => gotoPage(p));
      container.appendChild(dot);
    }

    container.appendChild(createArrow("next"));

    const active = container.querySelector(".page-dot.active");
    if (active && container.scrollWidth > container.clientWidth) {
      try {
        active.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      } catch (e) {
        active.scrollIntoView();
      }
    }
  }

  function gotoPage(p) {
    currentPage = p;
    aggiornaVisualizzazione(filtraDati(data));
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      aggiornaVisualizzazione(filtraDati(data));
    }
  }

  function nextPage(totalPages) {
    if (currentPage < totalPages) {
      currentPage++;
      aggiornaVisualizzazione(filtraDati(data));
    }
  }

  // Reset pagina quando cambia il numero per pagina o vista
  document.getElementById("maxRecords").addEventListener("change", () => {
    currentPage = 1;
    aggiornaVisualizzazione(filtraDati(data));
  });
  document
    .getElementById("vistaSelezionata")
    .addEventListener("change", () => {
      currentPage = 1;
      aggiornaVisualizzazione(filtraDati(data));
    });

  // ── Tabella ──────────────────────────────────────────────────────────

  function mostraTabella(records) {
    const tbody = document.querySelector("#tabellaFiltri tbody");
    tbody.innerHTML = "";

    const campi = getCampi();
    if (!records.length) return;

    records.forEach((r) => {
      const tr = document.createElement("tr");
      campi.forEach((c) => {
        const td = document.createElement("td");
        let val = r[c];
        if (Array.isArray(val)) val = val.join(", ");

        // Prova prima il customCell della config
        let handled = false;
        if (CFG.customCell) {
          handled = CFG.customCell(td, c, val, r);
        }

        if (!handled) {
          // Comportamento di default: link per Targhetta Tipo / Descrizione
          if (
            (c === "Targhetta Tipo" || c === "Descrizione") &&
            r.linkTarghetta &&
            r.linkTarghetta !== ""
          ) {
            const a = document.createElement("a");
            a.href = `targhetteTipo/${r.linkTarghetta}`;
            a.textContent = val;
            td.appendChild(a);
          } else {
            td.textContent = val;
          }
        }

        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // ── Card ─────────────────────────────────────────────────────────────

  function mostraCard(records) {
    const container = document.getElementById("cardContainer");
    container.innerHTML = "";
    immagini = [];

    const thList = document.querySelectorAll("#trTitoli th");
    const campi = getCampi();
    const etichette = {};
    thList.forEach((th) => {
      etichette[th.dataset.campo] = th.textContent;
    });

    records.forEach((r, i) => {
      const card = document.createElement("div");
      card.className = "card";

      const imgContainer = document.createElement("div");
      imgContainer.className = "card-image-container";

      const img = document.createElement("img");
      const imgPath = CFG.getImgPath(r);
      img.src = imgPath;
      img.alt = r["Descrizione"] || "Annullo";
      img.loading = "lazy";

      img.onerror = () => {
        img.style.display = "none";
        const span = document.createElement("span");
        span.textContent = "Immagine non ancora presente";
        span.style.fontSize = "12px";
        span.style.color = "#999";
        imgContainer.appendChild(span);
      };

      img.onclick = () => apriLightbox(i);
      imgContainer.appendChild(img);
      card.appendChild(imgContainer);

      const newCard = document.createElement("h3");
      card.appendChild(newCard);

      const detailsContainer = document.createElement("div");
      detailsContainer.className = "card-details";

      campi.forEach((campo) => {
        const p = document.createElement("p");
        let val = r[campo];
        if (Array.isArray(val)) val = val.join(", ");

        const label = etichette[campo] || campo;

        if (
          campo === "Descrizione" &&
          r.linkTarghetta &&
          r.linkTarghetta !== ""
        ) {
          const a = document.createElement("a");
          a.href = `targhetteTipo/${r.linkTarghetta}`;
          a.textContent = `${label}: ${val}`;
          p.appendChild(a);
        } else {
          p.textContent = `${label}: ${val}`;
        }

        detailsContainer.appendChild(p);
      });

      card.appendChild(detailsContainer);
      container.appendChild(card);
      immagini.push(imgPath);
    });
  }

  // ── Lista compatta mobile ────────────────────────────────────────────

  function mostraListaCompatta(records) {
    const container = document.getElementById("mobileListContainer");
    container.innerHTML = "";
    immagini = [];

    const countDiv = document.createElement("div");
    countDiv.className = "mobile-results-count";
    countDiv.textContent =
      records.length +
      " risultat" +
      (records.length === 1 ? "o" : "i");
    container.appendChild(countDiv);

    records.forEach((r, i) => {
      const item = document.createElement("div");
      item.className = "mobile-list-item";

      const thumb = document.createElement("div");
      thumb.className = "item-thumb";
      const imgPath = CFG.getImgPath(r);
      const img = document.createElement("img");
      img.src = imgPath;
      img.loading = "lazy";
      img.onerror = () => {
        img.style.display = "none";
        const noImg = document.createElement("span");
        noImg.className = "no-img";
        noImg.textContent = "\uD83D\uDDBC";
        thumb.appendChild(noImg);
      };
      thumb.appendChild(img);

      const info = document.createElement("div");
      info.className = "item-info";

      const title = document.createElement("div");
      title.className = "item-title";
      const desc = r["Descrizione"] || "Tipo " + r["Targhetta Tipo"];
      if (r.linkTarghetta && r.linkTarghetta !== "") {
        const a = document.createElement("a");
        a.href = `targhetteTipo/${r.linkTarghetta}`;
        a.textContent = desc;
        title.appendChild(a);
      } else {
        title.textContent = desc;
      }

      const meta = document.createElement("div");
      meta.className = "item-meta";
      const parts = [];
      if (r["Località"]) parts.push(r["Località"]);
      if (r["Denominazione ufficio"])
        parts.push(r["Denominazione ufficio"]);
      if (r["Anno"]) parts.push(r["Anno"]);
      meta.innerHTML = parts.join('<span class="sep">·</span>');

      info.appendChild(title);
      info.appendChild(meta);

      item.appendChild(thumb);
      item.appendChild(info);

      item.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return;
        apriLightbox(i);
      });

      container.appendChild(item);
      immagini.push(imgPath);
    });
  }

  // ── Lightbox ─────────────────────────────────────────────────────────

  function apriLightbox(index) {
    lightboxIndex = index;
    const overlay = document.getElementById("lightboxOverlay");
    const img = document.getElementById("lightboxImage");
    const fallback = document.getElementById("fallbackText");
    img.src = immagini[index];
    img.style.display = "block";
    fallback.textContent = "";
    img.onerror = () => {
      img.style.display = "none";
      fallback.textContent = "Immagine non ancora presente";
    };
    overlay.style.display = "flex";
  }

  function chiudiLightbox() {
    document.getElementById("lightboxOverlay").style.display = "none";
  }

  // Esponi le funzioni necessarie per i bottoni inline dell'HTML
  window.prevImage = function () {
    lightboxIndex =
      (lightboxIndex - 1 + immagini.length) % immagini.length;
    apriLightbox(lightboxIndex);
  };
  window.nextImage = function () {
    lightboxIndex = (lightboxIndex + 1) % immagini.length;
    apriLightbox(lightboxIndex);
  };
  window.chiudiLightbox = chiudiLightbox;

  // ── Grafico ──────────────────────────────────────────────────────────

  // Grafico: viene inizializzato solo se la libreria Chart.js è disponibile.
  let chart = null;

  function createChartInstance() {
    const canvas = document.getElementById("grafico");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Numero annulli",
            data: [],
            backgroundColor: "rgba(54,162,235,0.6)",
            borderColor: "rgba(54,162,235,1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "Anno" } },
          y: {
            title: { display: true, text: "Numero di annulli" },
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                return Math.floor(value);
              },
            },
          },
        },
      },
    });
  }

  function aggiornaGrafico(records) {
    // Se chart non esiste, non fare nulla
    if (!chart) return;
    const conteggio = {};
    records.forEach((r) => {
      const y = r && r.Anno !== undefined && r.Anno !== null ? r.Anno : null;
      if (y !== null) {
        const key = String(y);
        conteggio[key] = (conteggio[key] || 0) + 1;
      }
    });
    const anni = Object.keys(conteggio).sort((a, b) => Number(a) - Number(b));
    const valori = anni.map((a) => conteggio[a]);
    chart.data.labels = anni;
    chart.data.datasets[0].data = valori;
    chart.update();
  }

  // Controllo consenso e comportamento placeholder
  function ensureChartAvailability() {
    const wrapper = document.getElementById('graficoWrapper');
    function showPlaceholder() {
      if (!wrapper) return;
      wrapper.innerHTML = '<div class="third-party-placeholder">Servizio di terze parti: accetta l\'uso di cookie per attivarlo. <button id="acceptChartBtn">Accetta</button></div>';
      const btn = document.getElementById('acceptChartBtn');
      if (btn) btn.addEventListener('click', function(){
        try { localStorage.setItem('cookie_consent_status','accepted'); } catch(e){}
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', function(){
          chart = createChartInstance();
          aggiornaGrafico(data);
        });
      });
    }

    try {
      const consent = localStorage.getItem('cookie_consent_status');
      if (consent === 'accepted' && typeof Chart !== 'undefined') {
        chart = createChartInstance();
      } else if (consent === 'accepted' && typeof Chart === 'undefined') {
        // load Chart.js then create
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', function(){
          chart = createChartInstance();
        });
      } else {
        // no consent -> show placeholder
        showPlaceholder();
      }
    } catch(e) {
      showPlaceholder();
    }
  }

  // Utility per caricare script dinamicamente
  function loadScript(src, cb) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb || function(){};
    s.onerror = function(){ console.error('Failed to load script', src); };
    document.body.appendChild(s);
  }

  // Avvia controllo disponibilità chart
  ensureChartAvailability();

  // ── Eventi globali ───────────────────────────────────────────────────

  document
    .getElementById("maxRecords")
    .addEventListener("change", () =>
      aggiornaVisualizzazione(filtraDati(data)),
    );
  document
    .getElementById("vistaSelezionata")
    .addEventListener("change", () =>
      aggiornaVisualizzazione(filtraDati(data)),
    );
  document
    .getElementById("schemaCatalogazione")
    .addEventListener("change", () =>
      aggiornaVisualizzazione(filtraDati(data)),
    );

  document
    .getElementById("mobileFilterToggle")
    .addEventListener("click", toggleMobileFilters);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") chiudiLightbox();
    if (e.key === "ArrowLeft") window.prevImage();
    if (e.key === "ArrowRight") window.nextImage();
  });
})();
