(function (root) {
  var VOICE_NUM_WORDS = {
    cero: 0,
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    veintiun: 21,
    veintiuno: 21,
    veintiuna: 21,
    veintidos: 22,
    veintitres: 23,
    veinticuatro: 24,
    veinticinco: 25,
    veintiseis: 26,
    veintisiete: 27,
    veintiocho: 28,
    veintinueve: 29,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900,
    mil: 1000,
  };

  var VOICE_PRODUCTS = [
    {
      key: 'razas-pequenas',
      label: 'AdRazPeq',
      re: /ad\s*raz(?:as?)?\s*peq(?:uenas?)?|adulto\s+razas?(?:\s+peq(?:uenas?)?)?|razas?\s+(?:pequenas?|peq|chicas?)/,
    },
    { key: 'veteranos', label: 'Veteranos', re: /veteranos?|senior(?:es)?/ },
    { key: 'cachorro', label: 'Cachorro', re: /cachorros?|puppy|puppies/ },
    { key: 'felinos', label: 'Felinos', re: /felinos?|gatos?/ },
    { key: 'activo', label: 'Activo', re: /activos?/ },
    { key: 'adulto', label: 'Adulto', re: /adultos?/ },
  ];

  var DEFAULT_KG = {
    cachorro: [2, 8, 20],
    adulto: [2, 8, 20],
    veteranos: [2, 15],
    'razas-pequenas': [2, 8],
    activo: [2, 20],
    felinos: [1.5, 3, 6],
  };

  function stripAccents(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function replaceSpanishNumberWords(text) {
    var tokens = String(text || '').split(/\s+/);
    var out = [];
    var i = 0;
    while (i < tokens.length) {
      var a = VOICE_NUM_WORDS[tokens[i]];
      if (a == null) {
        out.push(tokens[i]);
        i += 1;
        continue;
      }
      var n = a;
      if (
        tokens[i + 1] === 'y' &&
        VOICE_NUM_WORDS[tokens[i + 2]] != null &&
        VOICE_NUM_WORDS[tokens[i + 2]] < 10 &&
        n >= 20 &&
        n % 10 === 0
      ) {
        n += VOICE_NUM_WORDS[tokens[i + 2]];
        i += 3;
      } else {
        i += 1;
      }
      out.push(String(n));
    }
    return out.join(' ');
  }

  function normalizeVoiceText(raw) {
    var t = stripAccents(String(raw || '').toLowerCase());
    t = t.replace(/[,;:]/g, ' ');
    t = t.replace(
      /\b((?:un|uno|una)\s+)?(kilo|kilos|kilogramos|kg)\s+y\s+medio\b|\b(?:un|uno|una)\s+y\s+medi[oa]\b/g,
      ' 1.5 kg '
    );
    t = t.replace(/\b(un|uno|una)\s+(punto|coma)\s+(cinco|5)\b/g, ' 1.5 ');
    t = replaceSpanishNumberWords(t);
    t = t.replace(/\b(\d+)\s+(punto|coma)\s+(\d+)\b/g, '$1.$3');
    t = t.replace(
      /(\d)(pzas?|piezas?|bolsas?|cajas?|costales?|kilogramos?|kilos?|kg)\b/g,
      '$1 $2'
    );
    t = t.replace(/\b(kilogramos?|kilos?)\b/g, 'kg');
    t = t.replace(/\b(pzas?|bolsas?|cajas?|costales?|piezas?)\b/g, 'pz');
    t = t.replace(/(\d)(kg|pz)\b/g, '$1 $2');
    t = t.replace(/\b(kg|pz)(\d)/g, '$1 $2');
    t = t.replace(/[^a-z0-9.\s]/g, ' ');
    t = t.replace(/(\d)\.(?!\d)/g, '$1 ');
    t = t.replace(/\.(?!\d)/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  function tokenizeVoice(text) {
    return String(text || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part) {
        if (part === 'de' || part === 'y' || part === 'kg' || part === 'pz') {
          return part;
        }
        if (/^\d+(?:\.\d+)?$/.test(part)) return parseFloat(part);
        return part;
      });
  }

  function isNum(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function availableKgFor(product, opts) {
    if (opts && typeof opts.availableKg === 'function') {
      var fromFn = opts.availableKg(product);
      if (fromFn && fromFn.length) return fromFn;
    }
    return DEFAULT_KG[product] || [];
  }

  function resolveSpokenKg(product, spokenKg, available) {
    available = available || [];
    if (spokenKg == null || isNaN(spokenKg)) {
      return available.length === 1 ? available[0] : null;
    }
    var i;
    for (i = 0; i < available.length; i++) {
      if (Math.abs(available[i] - spokenKg) < 0.08) return available[i];
    }
    if (
      (spokenKg === 15 || spokenKg === 150 || spokenKg === 1) &&
      available.indexOf(1.5) !== -1
    ) {
      return 1.5;
    }
    return null;
  }

  function findProductMatches(text) {
    var found = [];
    VOICE_PRODUCTS.forEach(function (def) {
      var re = new RegExp(def.re.source, 'g');
      var m;
      while ((m = re.exec(text))) {
        found.push({
          def: def,
          index: m.index,
          end: m.index + m[0].length,
          len: m[0].length,
        });
      }
    });
    found.sort(function (a, b) {
      if (a.index !== b.index) return a.index - b.index;
      return b.len - a.len;
    });
    var kept = [];
    found.forEach(function (hit) {
      var overlaps = kept.some(function (k) {
        return !(hit.end <= k.index || hit.index >= k.end);
      });
      if (!overlaps) kept.push(hit);
    });
    kept.sort(function (a, b) {
      return a.index - b.index;
    });
    return kept;
  }

  function stripTrailingNextQty(afterText) {
    return String(afterText || '')
      .replace(/\s+(?:y\s+)?(\d+(?:\.\d+)?)(?:\s+pz)?\s+de\s*$/i, '')
      .trim();
  }

  function qtyImmediatelyBefore(beforeText) {
    var tokens = tokenizeVoice(beforeText);
    while (tokens.length && tokens[tokens.length - 1] === 'y') tokens.pop();
    if (!tokens.length) return null;
    var i = tokens.length - 1;
    if (tokens[i] === 'de') i -= 1;
    if (i >= 0 && tokens[i] === 'pz') i -= 1;
    if (i < 0 || !isNum(tokens[i])) return null;
    if (i >= 1 && tokens[i - 1] === 'kg') return null;
    return tokens[i];
  }

  function parseGroupedSpecs(product, afterText, opts) {
    var tokens = tokenizeVoice(afterText);
    var available = availableKgFor(product, opts);
    var items = [];
    var i = 0;

    function skipSeps() {
      while (i < tokens.length && (tokens[i] === 'y' || tokens[i] === 'de')) {
        i += 1;
      }
    }

    function pushPair(qty, kgSpoken) {
      if (!(qty > 0) || !Number.isFinite(qty) || kgSpoken == null) return;
      items.push({
        qty: Math.round(qty),
        kgSpoken: kgSpoken,
        complete: true,
      });
    }

    while (i < tokens.length) {
      skipSeps();
      if (i >= tokens.length) break;
      if (!isNum(tokens[i])) {
        i += 1;
        continue;
      }

      if (
        isNum(tokens[i]) &&
        isNum(tokens[i + 1]) &&
        tokens[i] === 1 &&
        (tokens[i + 1] === 5 || tokens[i + 1] === 50) &&
        resolveSpokenKg(product, 1.5, available) === 1.5
      ) {
        tokens[i] = 1.5;
        tokens.splice(i + 1, 1);
        continue;
      }

      var a = tokens[i];
      var b = tokens[i + 1];
      var c = tokens[i + 2];
      var d = tokens[i + 3];

      if (b === 'pz' && c === 'de' && isNum(d)) {
        pushPair(a, d);
        i += tokens[i + 4] === 'kg' ? 5 : 4;
        continue;
      }
      if (b === 'de' && isNum(c)) {
        pushPair(a, c);
        i += tokens[i + 3] === 'kg' ? 4 : 3;
        continue;
      }
      if (b === 'kg' && isNum(c)) {
        pushPair(c, a);
        i += tokens[i + 3] === 'pz' ? 4 : 3;
        continue;
      }
      if (b === 'pz' && isNum(c)) {
        pushPair(a, c);
        i += tokens[i + 3] === 'kg' ? 4 : 3;
        continue;
      }
      if (isNum(b)) {
        var kgA = resolveSpokenKg(product, a, available);
        var kgB = resolveSpokenKg(product, b, available);
        if (kgA != null && (kgB == null || Math.abs(kgA - a) <= Math.abs((kgB || 0) - b))) {
          pushPair(b, kgA);
        } else if (kgB != null) {
          pushPair(a, kgB);
        } else if (kgA != null) {
          pushPair(b, kgA);
        }
        i += 2;
        continue;
      }
      if (b === 'kg' || b === 'pz') {
        items.push({ qty: null, kgSpoken: a, complete: false });
        i += 2;
        continue;
      }
      items.push({ qty: null, kgSpoken: a, complete: false });
      i += 1;
    }
    return items;
  }

  /**
   * Parser flexible (es-MX). Soporta:
   *  "20 de adulto 20"
   *  "Cachorro: 2 kg 5 piezas, 8 kg 2 piezas"
   *  "Adulto: 2 piezas de 2 kg, 8 kg 1 pieza"
   *  "Veteranos: 1 de 2 kg y 1 de 15"
   *  "Felinos 1.5 kg 4, 3 kg 2"
   * y varias de esas juntas en una sola frase.
   */
  function parseVoiceOrder(transcript, opts) {
    opts = opts || {};
    var text = normalizeVoiceText(transcript);
    var items = [];
    if (!text) return items;

    var hits = findProductMatches(text);
    hits.forEach(function (hit, idx) {
      var prevEnd = idx === 0 ? 0 : hits[idx - 1].end;
      var nextIndex =
        idx + 1 < hits.length ? hits[idx + 1].index : text.length;
      var before = text.slice(prevEnd, hit.index).trim();
      var after = text.slice(hit.end, nextIndex).trim();
      if (idx + 1 < hits.length) {
        after = stripTrailingNextQty(after);
      }

      var available = availableKgFor(hit.def.key, opts);
      var grouped = parseGroupedSpecs(hit.def.key, after, opts);
      var complete = grouped.filter(function (row) {
        return row.complete && row.qty > 0;
      });
      var qtyBefore = qtyImmediatelyBefore(before);

      function pushItem(qty, kgSpoken) {
        if (!(qty > 0) || !Number.isFinite(qty)) return;
        items.push({
          product: hit.def.key,
          label: hit.def.label,
          qty: Math.round(qty),
          kgSpoken: kgSpoken,
        });
      }

      if (complete.length) {
        complete.forEach(function (row) {
          pushItem(row.qty, row.kgSpoken);
        });
        return;
      }

      var leftover = grouped.filter(function (row) {
        return !row.complete && row.kgSpoken != null;
      });
      var kgSpoken = leftover.length ? leftover[0].kgSpoken : null;
      var qty = qtyBefore;

      if (qty == null && leftover.length >= 2) {
        qty = leftover[0].kgSpoken;
        kgSpoken = leftover[leftover.length - 1].kgSpoken;
      }
      if (qty == null && kgSpoken != null) {
        var asKg = resolveSpokenKg(hit.def.key, kgSpoken, available);
        if (asKg != null) {
          qty = leftover.length > 1 ? leftover.length : 1;
          kgSpoken = asKg;
        }
      }
      if (qty == null && kgSpoken == null && qtyBefore != null) {
        kgSpoken = resolveSpokenKg(hit.def.key, null, available);
        qty = qtyBefore;
      }
      if (leftover.length > 1 && qtyBefore == null) {
        leftover.forEach(function (row) {
          var kg = resolveSpokenKg(hit.def.key, row.kgSpoken, available);
          if (kg != null) pushItem(1, kg);
        });
        return;
      }
      pushItem(qty, kgSpoken);
    });
    return items;
  }

  var api = {
    VOICE_PRODUCTS: VOICE_PRODUCTS,
    DEFAULT_KG: DEFAULT_KG,
    normalizeVoiceText: normalizeVoiceText,
    parseVoiceOrder: parseVoiceOrder,
    resolveSpokenKg: resolveSpokenKg,
  };

  root.KantekVoiceOrder = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
