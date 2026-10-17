// Converte i blocchi <pre class="date-table-src" data-anno="1901"> in tabelle mese x giorno.
// Una riga per mese:   Mese | X: 1-13, 16 | O: 31 | impossibile: 1-26
//   X = giorno noto, O = riportato da Ornaghi, impossibile = grigio.
// I giorni inesistenti nel mese (es. 31 novembre) sono grigiati automaticamente.
(function () {
  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  function parseDays(text) {
    var days = [];
    text.split(",").forEach(function (part) {
      var m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) return;
      var a = +m[1], b = m[2] ? +m[2] : a;
      for (var d = a; d <= b; d++) days.push(d);
    });
    return days;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function build(pre) {
    var anno = parseInt(pre.dataset.anno, 10);
    var table = el("table", "date-table");
    var head = el("tr");
    head.appendChild(el("th", "", "Mese"));
    for (var d = 1; d <= 31; d++) head.appendChild(el("th", "", d));
    table.appendChild(el("thead")).appendChild(head);
    var body = el("tbody");
    table.appendChild(body);

    pre.textContent.split("\n").forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === "#") return;
      var fields = line.split("|").map(function (s) { return s.trim(); });
      var idx = MESI.indexOf(fields[0].toLowerCase());
      var marks = {};
      fields.slice(1).forEach(function (f) {
        var kv = f.split(":");
        var key = kv[0].trim().toLowerCase();
        var symbol = key === "x" ? "X" : key === "o" ? "O" : key === "impossibile" ? "-" : null;
        if (symbol) parseDays(kv[1] || "").forEach(function (day) { marks[day] = symbol; });
      });
      var len = idx >= 0 ? new Date(anno, idx + 1, 0).getDate() : 31;
      var tr = el("tr");
      tr.appendChild(el("th", "", fields[0]));
      for (var day = 1; day <= 31; day++) {
        var s = day > len ? "-" : marks[day];
        var td = el("td", s === "-" ? "non-possibile" : s ? "marcata" : "", s === "X" || s === "O" ? s : "");
        tr.appendChild(td);
      }
      body.appendChild(tr);
    });

    var wrap = el("div", "table-scroll");
    wrap.appendChild(table);
    wrap.appendChild(el("p", "", "Legenda: X = giorno noto, O = giorno riportato da Ornaghi, vuoto = giorno non noto"));
    pre.replaceWith(wrap);
  }

  document.querySelectorAll("pre.date-table-src").forEach(build);
})();
