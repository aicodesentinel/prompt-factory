(() => {
  const $ = (id) => document.getElementById(id);

  const LS = {
    catalog: "acs_cosmos_catalog_v3",
    presets: "acs_cosmos_presets_v3",
    logo: "acs_cosmos_logo_v3",
    last: "acs_cosmos_last_v3"
  };

  let CATALOG = loadCatalog();
  let PRESETS = loadPresets();
  let OUT = {};        // {tabId: string}
  let TAB_ORDER = [];  // [tabId]
  let CURRENT_TAB = "";

  // ---------- boot ----------
  function boot(){
    $("verPill").textContent = CATALOG.version || "v3.0-cosmos";

    const logoData = localStorage.getItem(LS.logo);
    if(logoData) $("logoBox").style.backgroundImage = `url('${logoData}')`;

    // dialogs close
    document.querySelectorAll("[data-close]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-close");
        $(id).close();
      });
    });

    $("helpBody").innerHTML = window.ACS_GUIDES?.howToUseHTML || "";
    $("guideBody").innerHTML = window.ACS_GUIDES?.integrationsHTML || "";

    $("btnHelp").addEventListener("click", ()=> $("dlgHelp").showModal());
    $("btnGuide").addEventListener("click", ()=> $("dlgGuide").showModal());
    $("btnEditor").addEventListener("click", openEditor);

    $("btnGenerate").addEventListener("click", generateAll);
    $("btnReset").addEventListener("click", resetAll);

    $("btnExport").addEventListener("click", exportAll);
    $("btnImport").addEventListener("click", importAll);

    $("btnPresetSave").addEventListener("click", quickSavePreset);
    $("btnPresetLoad").addEventListener("click", quickLoadPreset);

    $("btnCopyCurrent").addEventListener("click", ()=> copyText(OUT[CURRENT_TAB] || ""));
    $("btnCopyAll").addEventListener("click", ()=> copyText(buildAllBundle()));
    $("btnDownload").addEventListener("click", downloadBundle);

    // logo
    $("btnLogo").addEventListener("click", ()=> $("logoFile").click());
    $("logoFile").addEventListener("change", onLogoFile);

    // build UI
    buildForm();
    buildArtifacts();
    buildModules();

    // restore last
    const last = localStorage.getItem(LS.last);
    if(last){
      try{ applyState(JSON.parse(last)); }catch{}
    }

    setStrategyPill("AUTO", "AUTO");

    rememberLast();
  }

  // ---------- storage ----------
  function loadCatalog(){
    const raw = localStorage.getItem(LS.catalog);
    if(raw){
      try{ return JSON.parse(raw); }catch{}
    }
    return structuredClone(window.ACS_DEFAULTS);
  }
  function loadPresets(){
    const raw = localStorage.getItem(LS.presets);
    if(raw){
      try{ return JSON.parse(raw) || {}; }catch{}
    }
    return {};
  }
  function saveCatalog(){ localStorage.setItem(LS.catalog, JSON.stringify(CATALOG)); }
  function savePresets(){ localStorage.setItem(LS.presets, JSON.stringify(PRESETS)); }

  // ---------- UI builders ----------
  function buildForm(){
    const grid = $("formGrid");
    grid.innerHTML = "";

    for(const f of CATALOG.fields){
      const field = document.createElement("div");
      field.className = "field";
      const longIds = new Set(["offer","services","seoKeywords","notesExtra"]);
      if(f.type === "textarea" || longIds.has(f.id)) field.classList.add("row2");

      const label = document.createElement("label");
      label.textContent = f.label + (f.required ? " *" : "");
      field.appendChild(label);

      if(f.type === "select"){
        const search = document.createElement("input");
        search.placeholder = "Buscar en la lista…";
        search.dataset.for = f.id;

        const sel = document.createElement("select");
        sel.id = f.id;

        fillSelect(sel, f.options);
        sel.appendChild(new Option("Z) Personalizado (escribir)", "__custom__"));

        const custom = document.createElement("input");
        custom.id = f.id + "_custom";
        custom.placeholder = "Escribe tu opción…";
        custom.style.display = "none";
        custom.classList.add("mono");

        const help = document.createElement("div");
        help.className = "smallNote";
        help.textContent = f.help || "";

        search.addEventListener("input", ()=>{
          filterSelectOptions(sel, f.options, search.value);
          ensureCustomOption(sel);
          rememberLast();
        });

        sel.addEventListener("change", ()=>{
          custom.style.display = sel.value === "__custom__" ? "block" : "none";
          rememberLast();
        });
        custom.addEventListener("input", rememberLast);

        field.appendChild(search);
        field.appendChild(sel);
        field.appendChild(custom);
        field.appendChild(help);
      }
      else if(f.type === "text"){
        const input = document.createElement("input");
        input.id = f.id;
        input.placeholder = f.placeholder || "";
        input.addEventListener("input", rememberLast);
        field.appendChild(input);

        const help = document.createElement("div");
        help.className = "smallNote";
        help.textContent = f.help || "";
        field.appendChild(help);
      }
      else if(f.type === "textarea"){
        const ta = document.createElement("textarea");
        ta.id = f.id;
        ta.placeholder = f.placeholder || "";
        ta.addEventListener("input", rememberLast);
        field.appendChild(ta);

        const help = document.createElement("div");
        help.className = "smallNote";
        help.textContent = f.help || "";
        field.appendChild(help);
      }

      grid.appendChild(field);
    }

    $("notes").addEventListener("input", rememberLast);
  }

  function buildArtifacts(){
    const grid = $("artifactGrid");
    grid.innerHTML = "";
    for(const a of CATALOG.artifacts){
      const wrap = document.createElement("div");
      wrap.className = "pick";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = a.id;
      cb.checked = !!a.default;
      cb.addEventListener("change", rememberLast);

      const text = document.createElement("div");
      const b = document.createElement("b"); b.textContent = a.label;
      const s = document.createElement("span"); s.textContent = a.desc;
      text.appendChild(b); text.appendChild(s);

      wrap.appendChild(cb); wrap.appendChild(text);
      grid.appendChild(wrap);
    }
  }

  function buildModules(){
    const grid = $("moduleGrid");
    grid.innerHTML = "";
    for(const m of CATALOG.modules){
      const wrap = document.createElement("div");
      wrap.className = "module";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = m.id;
      cb.checked = !!m.default;
      cb.addEventListener("change", rememberLast);

      const text = document.createElement("div");
      const b = document.createElement("b"); b.textContent = m.label;
      const s = document.createElement("span"); s.textContent = m.desc;
      text.appendChild(b); text.appendChild(s);

      wrap.appendChild(cb); wrap.appendChild(text);
      grid.appendChild(wrap);
    }
  }

  function fillSelect(sel, options){
    sel.innerHTML = "";
    for(const opt of options) sel.appendChild(new Option(opt, opt));
  }
  function ensureCustomOption(sel){
    const has = Array.from(sel.options).some(o=>o.value==="__custom__");
    if(!has) sel.appendChild(new Option("Z) Personalizado (escribir)", "__custom__"));
  }
  function filterSelectOptions(sel, allOptions, query){
    const q = (query||"").trim().toLowerCase();
    const keep = q ? allOptions.filter(o=>String(o).toLowerCase().includes(q)) : allOptions;
    fillSelect(sel, keep);
  }

  // ---------- state ----------
  function readFieldValue(id){
    const sel = $(id);
    const custom = $(id+"_custom");
    if(sel && sel.tagName === "SELECT"){
      if(sel.value === "__custom__"){
        return (custom?.value || "").trim() || "Personalizado (sin especificar)";
      }
      return sel.value;
    }
    const el = $(id);
    if(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")){
      return (el.value || "").trim();
    }
    return "";
  }

  function getState(){
    const fields = {};
    for(const f of CATALOG.fields) fields[f.id] = readFieldValue(f.id);

    const artifacts = {};
    for(const a of CATALOG.artifacts) artifacts[a.id] = !!$(a.id)?.checked;

    const modules = {};
    for(const m of CATALOG.modules) modules[m.id] = !!$(m.id)?.checked;

    return {
      fields,
      artifacts,
      modules,
      notes: ($("notes").value||"").trim()
    };
  }

  function applyState(state){
    if(!state) return;

    // fields
    for(const f of CATALOG.fields){
      const id = f.id;
      const v = state.fields?.[id];
      if(v === undefined) continue;

      const sel = $(id);
      const custom = $(id+"_custom");
      const search = document.querySelector(`input[data-for="${id}"]`);

      if(sel && sel.tagName === "SELECT"){
        const opts = Array.from(sel.options).map(o=>o.value);
        if(opts.includes(v)){
          sel.value = v;
          if(custom){ custom.style.display="none"; custom.value=""; }
        }else{
          sel.value = "__custom__";
          if(custom){ custom.style.display="block"; custom.value = v; }
        }
        if(search) search.value = "";
      } else {
        const input = $(id);
        if(input) input.value = v;
      }
    }

    // artifacts
    for(const a of CATALOG.artifacts){
      if(state.artifacts && a.id in state.artifacts){
        const cb = $(a.id);
        if(cb) cb.checked = !!state.artifacts[a.id];
      }
    }

    // modules
    for(const m of CATALOG.modules){
      if(state.modules && m.id in state.modules){
        const cb = $(m.id);
        if(cb) cb.checked = !!state.modules[m.id];
      }
    }

    $("notes").value = state.notes || "";
    rememberLast();
  }

  function rememberLast(){
    localStorage.setItem(LS.last, JSON.stringify(getState()));
  }

  function resetAll(){
    localStorage.removeItem(LS.last);
    location.reload();
  }

  // ---------- Intent Engine ----------
  function inferStrategy(d){
    // Scores: Ambigüedad (A), Riesgo (R), Complejidad (C)
    let A=0, R=0, C=0;

    // Ambigüedad: faltan oferta/audiencia/servicios o tipo mixto
    if(!d.offer) A += 2;
    if(!d.audience) A += 1;
    if(!d.services) A += 1;
    if(d.artifactMain.includes("Mixto")) A += 2;

    // Riesgo: pagos/legal/datos
    if(d.modules.mod_pay) R += 3;
    if(d.modules.mod_analytics) R += 1;
    if(d.modules.mod_legal) R += 2;
    if(d.niche.includes("salud")) R += 3;
    if(d.niche.includes("legal")) R += 2;

    // Complejidad: muchos módulos + nivel pro/agencia + varios artefactos
    const modCount = Object.values(d.modules).filter(Boolean).length;
    C += Math.max(0, modCount - 4);
    if(d.level.includes("Pro")) C += 2;
    if(d.level.includes("Agencia")) C += 4;
    const artCount = Object.values(d.artifacts).filter(Boolean).length;
    C += Math.max(0, artCount - 3);

    // Decide
    const needQuestions = (A >= 4); // mucha ambigüedad
    const highRiskOrComplex = (R >= 4 || C >= 5);

    let strategy = "MASTER";
    if(needQuestions) strategy = "META2";
    else if(highRiskOrComplex) strategy = "META";
    else strategy = "MASTER";

    return {strategy, A,R,C, needQuestions, highRiskOrComplex};
  }

  function setStrategyPill(strategy, badge){
    $("modeText").textContent = `Estrategia: ${strategy}`;
    $("modeBadge").textContent = badge;
  }

  function showScores(info){
    $("scoreBox").style.display = "block";
    const wrap = $("scores");
    wrap.innerHTML = "";
    const mk = (k,v)=> {
      const el = document.createElement("div");
      el.className="score";
      el.innerHTML = `<b>${k}</b>${v}`;
      return el;
    };
    wrap.appendChild(mk("A", info.A));
    wrap.appendChild(mk("R", info.R));
    wrap.appendChild(mk("C", info.C));

    const reasons = [];
    if(info.needQuestions) reasons.push("Ambigüedad alta → META² (preguntas críticas)");
    if(info.highRiskOrComplex) reasons.push("Riesgo/Complejidad alta → META");
    if(!info.needQuestions && !info.highRiskOrComplex) reasons.push("Bajo riesgo/ambigüedad → MASTER directo");
    $("scoreExplain").textContent = reasons.join(" · ");
  }

  // ---------- generators (artefactos) ----------
  function normalize(){
    const s = getState();
    const f = s.fields || {};
    const artifacts = s.artifacts || {};
    const modules = s.modules || {};
    return {
      version: CATALOG.version || "v3.0-cosmos",
      iaTarget: f.iaTarget || "Cualquier IA (agnóstico)",
      intent: f.intent || "",
      artifactMain: f.artifactMain || "",
      niche: f.niche || "",
      brand: f.brand || "",
      audience: f.audience || "",
      offer: f.offer || "",
      level: f.level || "",
      constraints: f.constraints || "",
      style: f.style || "",
      colors: f.colors || "",
      city: f.city || "",
      whatsapp: f.whatsapp || "",
      services: f.services || "",
      seoKeywords: f.seoKeywords || "",
      notesExtra: f.notesExtra || "",
      notes: s.notes || "",
      artifacts,
      modules
    };
  }

  function buildBrief(d){
    const lines = [];
    lines.push("=== BRIEF (COSMOS) ===");
    lines.push(`Marca: ${d.brand}`);
    lines.push(`Nicho: ${d.niche}`);
    lines.push(`Intención: ${d.intent}`);
    lines.push(`Tipo: ${d.artifactMain}`);
    lines.push(`Nivel: ${d.level}`);
    lines.push(`Restricciones: ${d.constraints}`);
    if(d.audience) lines.push(`Audiencia: ${d.audience}`);
    if(d.offer) lines.push(`Oferta: ${d.offer}`);
    if(d.services) lines.push(`Servicios/features: ${d.services}`);
    if(d.city) lines.push(`Ciudad: ${d.city}`);
    if(d.whatsapp) lines.push(`WhatsApp: ${d.whatsapp}`);
    if(d.seoKeywords) lines.push(`SEO keywords: ${d.seoKeywords}`);
    lines.push(`Estilo: ${d.style} · Colores: ${d.colors}`);
    lines.push("");
    lines.push("Módulos activados:");
    const on = Object.entries(d.modules).filter(([_,v])=>v).map(([k])=>k);
    lines.push(on.length ? "- " + on.join(", ") : "- (ninguno)");
    lines.push("");
    if(d.notesExtra){ lines.push("Notas extra (brief):"); lines.push(d.notesExtra); lines.push(""); }
    if(d.notes){ lines.push("Notas del sistema:"); lines.push(d.notes); lines.push(""); }
    lines.push(`IA destino: ${d.iaTarget}`);
    return lines.join("\n");
  }

  function buildMasterPrompt(d){
    return [
      "INSTRUCCIONES (MASTER PROMPT)",
      "- Responde en español, directo.",
      "- Si faltan datos: asume razonable y lista supuestos.",
      "- Entrega listo para usar, sin rollo.",
      "- Incluye checklist QA + errores típicos + pruebas rápidas.",
      "- Prioriza herramientas web/gratis/bajo costo.",
      "",
      "TAREA",
      `Con el BRIEF, genera lo necesario para: ${d.intent}.`,
      `Tipo principal: ${d.artifactMain}. Nivel: ${d.level}.`,
      `Restricciones: ${d.constraints}.`,
      "Incluye placeholders claros (ej: WHATSAPP_NUMBER, LOGO_URL, etc).",
      ""
    ].join("\n");
  }

  function buildMetaPrompt(d){
    return [
      "INSTRUCCIONES (META-PROMPT)",
      "Rol: Arquitecto de prompts.",
      "Objetivo: fabricar el MEJOR MASTER PROMPT para este proyecto.",
      "Salida obligatoria:",
      "1) MASTER PROMPT final (un solo bloque).",
      "2) Checklist QA y pruebas.",
      "3) Errores típicos y correcciones.",
      "Reglas: español, sin herramientas caras, sin instalar por default.",
      ""
    ].join("\n");
  }

  function buildMeta2(d){
    // preguntas críticas para bajar ambigüedad
    const qs = [
      "¿Cuál es la oferta exacta en 1 frase (qué vendes y a quién)?",
      "¿Cuál es el CTA principal (WhatsApp, formulario, reservar, comprar)?",
      "¿Qué 3 secciones NO pueden faltar en la página/solución?"
    ];
    const brief = buildBrief(d);
    return [
      "INSTRUCCIONES (META²)",
      "Rol: Director de estrategia de prompts.",
      "1) Si falta información crítica: haz 3 preguntas.",
      "2) Luego decide MASTER o META, y entrega prompt final listo para pegar.",
      "3) Incluye ruta por fases (Demo→Pro→Agencia).",
      "",
      "BRIEF:",
      brief,
      "",
      "PREGUNTAS CRÍTICAS (si aplica):",
      "- " + qs.join("\n- "),
      ""
    ].join("\n");
  }

  function buildWorkflowBlueprint(d){
    return [
      "=== WORKFLOW BLUEPRINT (web-only / barato) ===",
      `Objetivo: ${d.intent} · Negocio: ${d.niche} · Marca: ${d.brand}`,
      "",
      "1) Trigger (entrada)",
      "- Form submit (web) o WhatsApp click (evento) o nuevo lead en Google Sheet.",
      "",
      "2) Captura y normaliza datos",
      "- Nombre, teléfono, email, mensaje, fuente, timestamp.",
      "",
      "3) Enrutamiento (reglas)",
      "- Si mensaje contiene 'precio' → responde con paquete/FAQ",
      "- Si contiene 'cita' → agenda (Calendly/Google)",
      "- Si contiene 'urgente' → notificar WhatsApp/Email",
      "",
      "4) Acciones",
      "- Guardar en Google Sheet",
      "- Notificación a correo/WhatsApp Business",
      "- (Opcional) CRM simple (Airtable/Notion) — si lo permites",
      "",
      "5) QA / pruebas",
      "- Enviar 3 casos: normal, incompleto, spam",
      "- Verificar que se guarde y notifique",
      "",
      "Herramientas recomendadas:",
      "- Make / Zapier (web)",
      "- ManyChat (si quieres automatizar DM/WhatsApp)",
      ""
    ].join("\n");
  }

  function buildSeoLegalPack(d){
    const base = [];
    base.push("=== SEO + LEGAL (plantilla) ===");
    base.push("");
    base.push("SEO (recomendado):");
    base.push(`- Title: ${d.brand} | ${d.niche} | ${d.city || "Tu ciudad"}`);
    base.push(`- Description: ${d.offer || "Describe tu oferta en 155 caracteres."}`);
    base.push(`- Keywords: ${d.seoKeywords || "(define 5-10 keywords)"} `);
    base.push("- OG tags: og:title, og:description, og:image, og:url");
    base.push("- Schema JSON-LD: LocalBusiness/Organization (según nicho)");
    base.push("");
    base.push("LEGAL (plantilla base, revisar con abogado):");
    base.push("- Aviso de Privacidad (qué recolectas, para qué, cómo contactar)");
    base.push("- Términos y Condiciones (uso del sitio, limitaciones)");
    base.push("- Aviso Legal / Disclaimer (no constituye asesoría, etc.)");
    base.push("");
    base.push("Checklist:");
    base.push("- ¿Tienes contacto real (correo/teléfono) en footer?");
    base.push("- ¿Tienes consentimiento si capturas datos?");
    base.push("- ¿Tienes políticas accesibles desde el footer?");
    return base.join("\n");
  }

  function buildAssetsPrompts(d){
    return [
      "=== ASSETS (prompts) ===",
      "",
      "1) Logo (imagen)",
      `Prompt: Logo minimal premium para "${d.brand}" (${d.niche}). Estilo ${d.style}, paleta ${d.colors}. Fondo transparente, vector-like, alto contraste.`,
      "",
      "2) Hero (imagen)",
      `Prompt: Imagen hero para "${d.brand}" (${d.niche}) transmitiendo ${d.intent}. Estética ${d.style}, iluminación profesional, composición limpia.`,
      "",
      "3) Música (opcional)",
      `Prompt (Suno): Ambient elegante para sitio "${d.brand}", tono ${d.style}, 90-110bpm, sin letras o vocal suave, vibe profesional.`,
      "",
      "4) Video (guion corto)",
      `Prompt: guion TikTok 30-45s para ${d.brand} (${d.niche}) con hook, 3 bullets de valor y CTA a ${d.whatsapp ? "WhatsApp" : "contacto"}.`,
      ""
    ].join("\n");
  }

  function buildCodeBase(d){
    // Genera un index.html listo (local) basado en módulos
    const has = (id)=> !!d.modules[id];
    const wa = (d.whatsapp || "5210000000000");

    const sections = [];
    sections.push(`
      <section class="hero" id="inicio">
        <div class="hero-inner">
          <div>
            <h1>${escapeHtml(d.brand)}</h1>
            <p>${escapeHtml(d.offer || `Soluciones de ${d.niche} con enfoque profesional y resultados.`)}</p>
            <div class="cta-row">
              <a class="btn" href="#contacto">Contactar</a>
              <a class="btn ghost" href="#servicios">Ver servicios</a>
            </div>
            <div class="meta">
              <span>${escapeHtml(d.niche)}</span>
              <span>${escapeHtml(d.city || "Tu ciudad")}</span>
            </div>
          </div>
          <div class="card">
            <h3>Atención rápida</h3>
            <ul>
              <li>Respuesta clara</li>
              <li>Proceso simple</li>
              <li>Confianza y privacidad</li>
            </ul>
          </div>
        </div>
      </section>
    `);

    sections.push(`
      <section class="section" id="servicios">
        <div class="wrap">
          <h2>Servicios</h2>
          <p class="muted">${escapeHtml(d.services || "Define aquí tus principales servicios. (Puedes editar esta sección).")}</p>
          <div class="grid3">
            <div class="box"><b>Servicio 1</b><span>Describe en una línea.</span></div>
            <div class="box"><b>Servicio 2</b><span>Describe en una línea.</span></div>
            <div class="box"><b>Servicio 3</b><span>Describe en una línea.</span></div>
          </div>
        </div>
      </section>
    `);

    if(has("mod_agenda")){
      sections.push(`
        <section class="section" id="agenda">
          <div class="wrap">
            <h2>Agenda una cita</h2>
            <p class="muted">Opción fácil: Calendly embed. Opción gratis: link a Google Calendar appointment schedule.</p>
            <div class="box">
              <b>Placeholder Agenda</b>
              <span>Pega aquí tu embed o un botón que abra tu link de agenda.</span>
            </div>
          </div>
        </section>
      `);
    }

    if(has("mod_form")){
      sections.push(`
        <section class="section" id="contacto">
          <div class="wrap">
            <h2>Contacto</h2>
            <p class="muted">Formulario local (demo). Para producción: Google Forms o EmailJS (ver guía).</p>
            <form id="leadForm" class="form">
              <label>Nombre<input name="name" required /></label>
              <label>Email<input name="email" type="email" required /></label>
              <label>Mensaje<textarea name="message" rows="4" required></textarea></label>
              <button class="btn" type="submit">Enviar</button>
              <p class="tiny" id="formMsg"></p>
            </form>
          </div>
        </section>
      `);
    } else {
      sections.push(`
        <section class="section" id="contacto">
          <div class="wrap">
            <h2>Contacto</h2>
            <p class="muted">Escribe cómo prefieres que te contacten.</p>
          </div>
        </section>
      `);
    }

    if(has("mod_legal")){
      sections.push(`
        <section class="section" id="legal">
          <div class="wrap">
            <h2>Legal</h2>
            <div class="grid2">
              <div class="box"><b>Aviso de Privacidad</b><span>Plantilla base. Revisa con abogado.</span></div>
              <div class="box"><b>Términos</b><span>Plantilla base. Ajusta a tu operación.</span></div>
              <div class="box"><b>Aviso legal</b><span>Disclaimer, limitaciones y alcance.</span></div>
              <div class="box"><b>Cookies/Tracking</b><span>Si usas Analytics, informa.</span></div>
            </div>
          </div>
        </section>
      `);
    }

    const waBtn = has("mod_whatsapp") ? `
      <a class="wa" id="waBtn" href="#" aria-label="WhatsApp">
        <span>WhatsApp</span>
      </a>
    ` : "";

    const chat = has("mod_chat") ? `
      <div class="chat" id="chat">
        <button class="chat-btn" id="chatBtn">¿Ayuda?</button>
        <div class="chat-box" id="chatBox" hidden>
          <div class="chat-head"><b>Asistente</b><button id="chatClose">×</button></div>
          <div class="chat-body" id="chatBody">
            <p>Hola 👋 ¿Qué quieres hacer?</p>
            <button class="chip" data-q="servicios">Ver servicios</button>
            <button class="chip" data-q="contacto">Contactar</button>
            <button class="chip" data-q="agenda">Agendar cita</button>
          </div>
        </div>
      </div>
    ` : "";

    const media = has("mod_media") ? `
      <audio id="bgAudio" controls style="width:100%; margin-top:10px">
        <source src="music.mp3" type="audio/mpeg">
      </audio>
      <p class="tiny">Opcional: sube un archivo <b>music.mp3</b> a tu repo para que suene aquí.</p>
    ` : "";

    const seoHead = has("mod_seo") ? `
      <meta name="description" content="${escapeHtml(d.offer || `Servicios de ${d.niche} en ${d.city || "tu ciudad"}.`)}" />
      <meta property="og:title" content="${escapeHtml(d.brand)}" />
      <meta property="og:description" content="${escapeHtml(d.offer || `Servicios de ${d.niche}.`)}" />
      <meta property="og:type" content="website" />
      <script type="application/ld+json">
      ${JSON.stringify({
        "@context":"https://schema.org",
        "@type":"Organization",
        "name": d.brand,
        "url": "https://example.com",
        "areaServed": d.city || "MX",
        "description": d.offer || `Servicios de ${d.niche}.`
      }, null, 2)}
      </script>
    ` : "";

    const analytics = has("mod_analytics") ? `
      <!-- Analytics: pega aquí tu script GA4 -->
    ` : "";

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(d.brand)} | ${escapeHtml(d.niche)}</title>
  ${seoHead}
  ${analytics}
  <style>
    :root{--bg:#0b1220;--panel:#0f1b33;--b:rgba(255,255,255,.12);--t:rgba(255,255,255,.92);--m:rgba(255,255,255,.65);--a:#57d3ff;--r:16px;--shadow:0 10px 30px rgba(0,0,0,.45);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(1200px 600px at 10% 0%, rgba(87,211,255,.14), transparent 60%),var(--bg);color:var(--t)}
    header{position:sticky;top:0;background:rgba(11,18,32,.75);backdrop-filter:blur(10px);border-bottom:1px solid var(--b);z-index:10}
    .nav{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;gap:10px;padding:12px 14px;align-items:center}
    .brand{font-weight:900;letter-spacing:.08em;text-transform:uppercase}
    .links{display:flex;gap:10px;flex-wrap:wrap}
    .links a{color:var(--m);text-decoration:none;font-weight:800;font-size:13px}
    .links a:hover{color:var(--t)}
    .btn{display:inline-block;border:1px solid rgba(87,211,255,.35);background:rgba(87,211,255,.12);color:#eaffff;padding:10px 12px;border-radius:12px;font-weight:900;font-size:12px;text-decoration:none}
    .btn.ghost{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:rgba(255,255,255,.86)}
    .hero{padding:54px 14px 18px}
    .hero-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
    .hero h1{margin:0 0 8px;font-size:34px}
    .hero p{margin:0 0 12px;color:var(--m);line-height:1.5}
    .cta-row{display:flex;gap:10px;flex-wrap:wrap}
    .card,.box{border:1px solid var(--b);background:rgba(255,255,255,.03);border-radius:var(--r);padding:12px;box-shadow:var(--shadow)}
    .meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
    .meta span{padding:6px 10px;border:1px solid var(--b);border-radius:999px;background:rgba(255,255,255,.03);font-size:12px;color:var(--m)}
    .section{padding:18px 14px}
    .wrap{max-width:1100px;margin:0 auto}
    h2{margin:0 0 8px}
    .muted{color:var(--m);margin:0 0 10px}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .box b{display:block;margin-bottom:6px}
    .box span{color:var(--m);font-size:13px}
    .form{display:grid;gap:10px}
    label{font-size:12px;color:var(--m);font-weight:800}
    input,textarea{width:100%;padding:10px;border-radius:12px;border:1px solid var(--b);background:rgba(10,18,34,.55);color:var(--t);outline:none}
    .tiny{font-size:12px;color:var(--m)}
    footer{padding:18px 14px;border-top:1px solid var(--b);color:var(--m)}
    .wa{position:fixed;right:14px;bottom:14px;background:#25D366;color:#06140d;text-decoration:none;font-weight:900;padding:12px 14px;border-radius:999px;box-shadow:0 12px 24px rgba(0,0,0,.35)}
    .chat{position:fixed;left:14px;bottom:14px}
    .chat-btn{border:1px solid var(--b);background:rgba(255,255,255,.06);color:var(--t);padding:10px 12px;border-radius:999px;font-weight:900}
    .chat-box{width:260px;margin-top:10px;border:1px solid var(--b);background:rgba(11,18,32,.92);border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.45)}
    .chat-head{display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--b)}
    .chat-head button{background:transparent;border:none;color:var(--t);font-size:18px;cursor:pointer}
    .chat-body{padding:10px;display:grid;gap:8px}
    .chip{border:1px solid var(--b);background:rgba(255,255,255,.04);color:var(--t);padding:8px 10px;border-radius:999px;font-weight:900;text-align:left;cursor:pointer}
    @media (max-width: 900px){ .hero-inner{grid-template-columns:1fr} .grid3{grid-template-columns:1fr} .grid2{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <header>
    <div class="nav">
      <div class="brand">${escapeHtml(d.brand)}</div>
      <div class="links">
        <a href="#inicio">Inicio</a>
        <a href="#servicios">Servicios</a>
        ${has("mod_agenda") ? `<a href="#agenda">Agenda</a>` : ``}
        <a href="#contacto">Contacto</a>
        ${has("mod_legal") ? `<a href="#legal">Legal</a>` : ``}
      </div>
    </div>
  </header>

  ${sections.join("\n")}
  <section class="section">
    <div class="wrap">
      ${media}
    </div>
  </section>

  <footer class="wrap">
    <b>${escapeHtml(d.brand)}</b> · ${escapeHtml(d.city || "Tu ciudad")} · <span class="tiny">© ${new Date().getFullYear()}</span>
    ${has("mod_legal") ? `<div class="tiny">Privacidad · Términos · Aviso legal</div>` : ``}
  </footer>

  ${waBtn}
  ${chat}

  <script>
    // === SETTINGS ===
    const WA_NUMBER = "${wa}";
    const WA_TEXT = encodeURIComponent("Hola, quiero información sobre ${escapeJs(d.brand)}.");

    // WhatsApp
    const waBtn = document.getElementById("waBtn");
    if(waBtn){
      waBtn.href = "https://wa.me/" + WA_NUMBER + "?text=" + WA_TEXT;
    }

    // Form demo
    const form = document.getElementById("leadForm");
    const msg = document.getElementById("formMsg");
    if(form){
      form.addEventListener("submit", (e)=>{
        e.preventDefault();
        msg.textContent = "✅ Enviado (demo). Para producción usa Google Forms o EmailJS.";
        form.reset();
      });
    }

    // Chat local
    const chatBtn = document.getElementById("chatBtn");
    const chatBox = document.getElementById("chatBox");
    const chatClose = document.getElementById("chatClose");
    const chatBody = document.getElementById("chatBody");
    if(chatBtn && chatBox){
      chatBtn.onclick = ()=> chatBox.hidden = !chatBox.hidden;
      if(chatClose) chatClose.onclick = ()=> chatBox.hidden = true;
      if(chatBody){
        chatBody.addEventListener("click",(e)=>{
          const t = e.target;
          if(t && t.dataset && t.dataset.q){
            const q = t.dataset.q;
            const el = document.getElementById(q);
            if(el) el.scrollIntoView({behavior:"smooth"});
          }
        });
      }
    }
  </script>
</body>
</html>`;

    return html;
  }

  // ---------- main generate ----------
  function generateAll(){
    const d = normalize();
    const info = inferStrategy({
      modules: d.modules,
      artifacts: d.artifacts,
      offer: d.offer,
      audience: d.audience,
      services: d.services,
      level: d.level,
      artifactMain: d.artifactMain,
      niche: d.niche
    });

    setStrategyPill(info.strategy, info.strategy);
    showScores(info);

    const brief = buildBrief(d);

    OUT = {};
    TAB_ORDER = [];

    // Prompt strategy artifact
    if(d.artifacts.art_master){
      let promptBlock = "";
      if(info.strategy === "MASTER"){
        promptBlock = ["=== BRIEF ===", brief, "", "=== MASTER PROMPT ===", buildMasterPrompt(d)].join("\n");
      } else if(info.strategy === "META"){
        promptBlock = [
          "=== META (usa esto en tu IA) ===",
          "",
          "META-BRIEF:",
          brief,
          "",
          "META-PROMPT:",
          buildMetaPrompt(d),
          "",
          "NOTA: La IA debe devolverte el MASTER PROMPT final y checklist QA."
        ].join("\n");
      } else {
        promptBlock = buildMeta2(d);
      }
      OUT["prompt"] = promptBlock;
      TAB_ORDER.push("prompt");
    }

    // Codebase
    if(d.artifacts.art_codebase){
      OUT["code_index_html"] = buildCodeBase(d);
      TAB_ORDER.push("code_index_html");
    }

    // SEO+Legal
    if(d.artifacts.art_seo_legal){
      OUT["seo_legal"] = buildSeoLegalPack(d);
      TAB_ORDER.push("seo_legal");
    }

    // Integrations guide
    if(d.artifacts.art_integrations){
      OUT["integrations"] = stripHtml(window.ACS_GUIDES?.integrationsHTML || "") +
        "\n\nTIP: Si quieres la versión bonita, abre el botón “Guía Integraciones” dentro de la app.";
      TAB_ORDER.push("integrations");
    }

    // Workflow blueprint
    if(d.artifacts.art_workflow){
      OUT["workflow"] = buildWorkflowBlueprint(d);
      TAB_ORDER.push("workflow");
    }

    // Assets prompts
    if(d.artifacts.art_assets){
      OUT["assets"] = buildAssetsPrompts(d);
      TAB_ORDER.push("assets");
    }

    buildTabs();
    setTab(TAB_ORDER[0] || "");
    rememberLast();
  }

  // ---------- tabs / output ----------
  function buildTabs(){
    const tabs = $("tabs");
    tabs.innerHTML = "";
    for(const id of TAB_ORDER){
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = tabTitle(id);
      btn.onclick = ()=> setTab(id);
      tabs.appendChild(btn);
    }
    refreshTabActive();
  }

  function setTab(id){
    CURRENT_TAB = id;
    $("output").textContent = OUT[id] || "Sin contenido.";
    refreshTabActive();
  }

  function refreshTabActive(){
    const buttons = Array.from($("tabs").querySelectorAll(".tab"));
    buttons.forEach((b)=>{
      const id = TAB_ORDER[buttons.indexOf(b)];
      b.classList.toggle("active", id === CURRENT_TAB);
    });
  }

  function tabTitle(id){
    const map = {
      prompt: "Prompt",
      code_index_html: "Código (index.html)",
      seo_legal: "SEO + Legal",
      integrations: "Integraciones",
      workflow: "Workflow",
      assets: "Assets"
    };
    return map[id] || id;
  }

  function buildAllBundle(){
    const parts = [];
    for(const id of TAB_ORDER){
      parts.push("===== " + tabTitle(id).toUpperCase() + " =====");
      parts.push(OUT[id] || "");
      parts.push("");
    }
    return parts.join("\n");
  }

  function downloadBundle(){
    const txt = buildAllBundle();
    const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cosmos_bundle.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- copy ----------
  function copyText(txt){
    navigator.clipboard.writeText(txt).catch(()=>{});
  }

  // ---------- export/import ----------
  function exportAll(){
    const payload = {
      catalog: CATALOG,
      presets: PRESETS,
      last: getState()
    };
    const txt = JSON.stringify(payload, null, 2);
    copyText(txt);
    alert("Export copiado al portapapeles. Pégalo en notas para guardarlo.");
  }

  function importAll(){
    const txt = prompt("Pega aquí el JSON exportado (catálogo/presets/last):");
    if(!txt) return;
    try{
      const parsed = JSON.parse(txt);
      if(parsed.catalog) CATALOG = parsed.catalog;
      if(parsed.presets) PRESETS = parsed.presets;
      saveCatalog(); savePresets();
      if(parsed.last) localStorage.setItem(LS.last, JSON.stringify(parsed.last));
      location.reload();
    }catch(e){
      alert("JSON inválido. No se aplicó.\n\n" + e.message);
    }
  }

  // ---------- presets ----------
  function quickSavePreset(){
    const name = `Preset ${new Date().toLocaleString()}`;
    PRESETS[name] = getState();
    savePresets();
    alert("Guardado: " + name);
  }

  function quickLoadPreset(){
    const names = Object.keys(PRESETS);
    if(!names.length) return alert("No hay presets guardados.");
    const name = prompt("Escribe el nombre EXACTO del preset:\n\n" + names.join("\n"));
    if(!name) return;
    if(!PRESETS[name]) return alert("No existe ese preset.");
    applyState(PRESETS[name]);
    alert("Cargado: " + name);
  }

  // ---------- logo ----------
  function onLogoFile(e){
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const data = String(reader.result||"");
      $("logoBox").style.backgroundImage = `url('${data}')`;
      localStorage.setItem(LS.logo, data);
    };
    reader.readAsDataURL(f);
  }

  // ---------- editor ----------
  function openEditor(){
    const sec = $("editorSection");
    sec.innerHTML = "";
    const items = [
      {k:"fields", label:"Campos (fields)"},
      {k:"artifacts", label:"Artefactos (artifacts)"},
      {k:"modules", label:"Módulos (modules)"},
      {k:"tools", label:"Herramientas (tools)"},
      {k:"guides", label:"Guías (ACS_GUIDES)"}
    ];
    items.forEach(it=> sec.appendChild(new Option(it.label, it.k)));

    sec.onchange = ()=> renderEditorJson(sec.value);
    renderEditorJson(sec.value);

    // presets list
    refreshPresetList();

    $("btnEditorApply").onclick = applyEditorJson;
    $("btnEditorReset").onclick = resetCatalogDefault;

    $("btnPresetSaveNamed").onclick = ()=>{
      const name = ($("presetName").value||"").trim();
      if(!name) return alert("Pon nombre al preset.");
      PRESETS[name] = getState();
      savePresets();
      refreshPresetList();
      alert("Guardado: " + name);
    };
    $("btnPresetLoadNamed").onclick = ()=>{
      const name = $("presetList").value;
      if(!name) return;
      applyState(PRESETS[name]);
      alert("Cargado: " + name);
      $("dlgEditor").close();
    };
    $("btnPresetDeleteNamed").onclick = ()=>{
      const name = $("presetList").value;
      if(!name) return;
      if(!confirm("¿Borrar preset: " + name + "?")) return;
      delete PRESETS[name];
      savePresets();
      refreshPresetList();
    };
    $("btnPresetRename").onclick = ()=>{
      const oldName = $("presetList").value;
      if(!oldName) return;
      const newName = prompt("Nuevo nombre:", oldName);
      if(!newName) return;
      if(PRESETS[newName]) return alert("Ya existe ese nombre.");
      PRESETS[newName] = PRESETS[oldName];
      delete PRESETS[oldName];
      savePresets();
      refreshPresetList();
      alert("Renombrado.");
    };

    $("dlgEditor").showModal();
  }

  function renderEditorJson(key){
    if(key === "guides"){
      $("editorJson").value = JSON.stringify(window.ACS_GUIDES, null, 2);
      return;
    }
    $("editorJson").value = JSON.stringify(CATALOG[key], null, 2);
  }

  function applyEditorJson(){
    const key = $("editorSection").value;
    const txt = $("editorJson").value;
    try{
      const parsed = JSON.parse(txt);
      if(key === "guides"){
        // apply guides to window + refresh dialog content
        window.ACS_GUIDES = parsed;
        $("helpBody").innerHTML = window.ACS_GUIDES?.howToUseHTML || "";
        $("guideBody").innerHTML = window.ACS_GUIDES?.integrationsHTML || "";
        alert("Guías aplicadas (en memoria). Para persistir: Export/Import.");
        return;
      }
      CATALOG[key] = parsed;
      saveCatalog();
      alert("Aplicado. La página se recargará.");
      location.reload();
    }catch(e){
      alert("JSON inválido. No se aplicó.\n\n" + e.message);
    }
  }

  function resetCatalogDefault(){
    if(!confirm("Revertir catálogo a default?")) return;
    localStorage.removeItem(LS.catalog);
    alert("Revertido. Recargando…");
    location.reload();
  }

  function refreshPresetList(){
    const list = $("presetList");
    list.innerHTML = "";
    const names = Object.keys(PRESETS).sort();
    for(const n of names) list.appendChild(new Option(n,n));
    if(names[0]) list.value = names[0];
  }

  // ---------- utils ----------
  function stripHtml(html){
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || tmp.innerText || "").trim();
  }
  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, m=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }
  function escapeJs(s){
    return String(s||"").replace(/\\/g,"\\\\").replace(/`/g,"\\`").replace(/\$/g,"\\$");
  }

  // ---------- init ----------
  boot();
})();
