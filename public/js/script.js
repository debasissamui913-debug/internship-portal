// ---------- Elements ----------
const $ = id => document.getElementById(id);
const cardGrid = $("cardGrid"), searchInput = $("searchInput"), domainFilter = $("domainFilter");
const clearBtn = $("clearBtn"), resultCount = $("resultCount"), message = $("message");
const navToggle = $("navToggle"), mainNav = $("mainNav");
const dialog = $("applyDialog"), form = $("applyForm"), formError = $("formError");
const submitBtn = $("submitBtn"), applySuccess = $("applySuccess");
const FIELDS = ["fullName", "email", "phone", "coverNote"];

let internships = [];

// ---------- Talking to the API ----------
// Wraps fetch with a timeout, and turns API errors into normal JavaScript errors
async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(body?.error?.message || "Request failed (" + res.status + ")");
      err.status = res.status;
      err.details = body?.error?.details;
      throw err;
    }
    return body;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The server took too long to respond.");
    if (err instanceof TypeError) throw new Error("Could not reach the server. Check your connection.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Messages: loading, empty, error ----------
function showMessage(text, { error = false, loading = false, retry = false } = {}) {
  message.className = error ? "message error" : "message";
  message.textContent = "";
  if (loading) {
    message.classList.add("loading");
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    message.appendChild(spinner);
  }
  message.appendChild(document.createTextNode(text));
  if (retry) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary";
    btn.textContent = "Try again";
    btn.addEventListener("click", loadInternships);
    message.appendChild(document.createElement("br"));
    message.appendChild(btn);
  }
  error ? message.setAttribute("role", "alert") : message.removeAttribute("role");
  message.hidden = false;
}

// ---------- Cards ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;   // textContent keeps user/API text safe
  return node;
}

function createCard(item) {
  const card = el("article", "card");
  card.appendChild(el("span", "badge", item.domain));
  card.appendChild(el("h3", "", item.title));

  const meta = el("ul", "meta");
  [["Location", item.location], ["Work mode", item.mode], ["Openings", String(item.openings)]].forEach(([label, value]) => {
    const li = document.createElement("li");
    li.appendChild(el("strong", "", label + ": "));
    li.appendChild(document.createTextNode(value));
    meta.appendChild(li);
  });
  card.appendChild(meta);

  const skills = el("ul", "skills");
  item.skills.forEach(s => skills.appendChild(el("li", "", s)));
  card.appendChild(skills);

  const btn = el("button", "btn btn-primary", "Apply Now");
  btn.type = "button";
  btn.setAttribute("aria-label", "Apply for " + item.title);
  btn.addEventListener("click", () => openApplyForm(item));
  card.appendChild(btn);
  return card;
}

function render(list) {
  cardGrid.replaceChildren(...list.map(createCard));
  resultCount.textContent = list.length + (list.length === 1 ? " internship found" : " internships found");
  if (list.length === 0) showMessage("No internships found. Try another search or filter.");
  else message.hidden = true;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const domain = domainFilter.value;
  render(internships.filter(i =>
    (domain === "all" || i.domain === domain) &&
    [i.title, i.domain, i.location, ...i.skills].some(t => t.toLowerCase().includes(query))
  ));
}

function fillDomains() {
  if (domainFilter.options.length > 1) return;
  [...new Set(internships.map(i => i.domain))].sort().forEach(d => {
    const o = document.createElement("option");
    o.value = o.textContent = d;
    domainFilter.appendChild(o);
  });
}

// ---------- Load data (loading, success, failure) ----------
async function loadInternships() {
  cardGrid.replaceChildren();
  cardGrid.setAttribute("aria-busy", "true");
  resultCount.textContent = "";
  showMessage("Loading internships...", { loading: true });
  try {
    const body = await fetchJson("/api/internships?limit=50");
    if (!Array.isArray(body.data)) throw new Error("The server sent data in an unexpected format.");
    internships = body.data;
    fillDomains();
    applyFilters();
  } catch (err) {
    resultCount.textContent = "";
    showMessage("Could not load internships. " + err.message, { error: true, retry: true });
  } finally {
    cardGrid.setAttribute("aria-busy", "false");
  }
}

// ---------- Application form ----------
// Same rules as the server. The server checks again, so this only helps the user.
function validateForm(v) {
  const errors = {};
  if (v.fullName.length < 2 || v.fullName.length > 80) errors.fullName = "Enter your full name (2 to 80 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = "Enter a valid email address.";
  if (v.phone && !/^\+?[0-9 ]{10,15}$/.test(v.phone)) errors.phone = "Phone must have 10 to 15 digits.";
  if (v.coverNote.length < 20 || v.coverNote.length > 1000) errors.coverNote = "Write between 20 and 1000 characters.";
  return errors;
}

function showFieldErrors(errors) {
  FIELDS.forEach(name => {
    $("err-" + name).textContent = errors[name] || "";
    errors[name] ? $(name).setAttribute("aria-invalid", "true") : $(name).removeAttribute("aria-invalid");
  });
  const first = FIELDS.find(n => errors[n]);
  if (first) $(first).focus();
}

function openApplyForm(item) {
  form.reset();
  showFieldErrors({});
  formError.hidden = true;
  form.hidden = false;
  applySuccess.hidden = true;
  $("internshipId").value = item.id;
  $("dialogTitle").textContent = "Apply for " + item.title;
  dialog.showModal();
  $("fullName").focus();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  formError.hidden = true;
  const values = {
    internshipId: $("internshipId").value,
    fullName: $("fullName").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    coverNote: $("coverNote").value.trim()
  };
  const errors = validateForm(values);
  showFieldErrors(errors);
  if (Object.keys(errors).length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  try {
    const res = await fetchJson("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    form.hidden = true;
    $("successText").textContent = "Application received for " + res.data.internshipTitle + ". Good luck!";
    applySuccess.hidden = false;
    $("doneBtn").focus();
  } catch (err) {
    formError.textContent = err.message + (err.details ? " " + err.details.join(". ") + "." : "");
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit application";
  }
});

$("cancelBtn").addEventListener("click", () => dialog.close());
$("doneBtn").addEventListener("click", () => dialog.close());

// ---------- Page events ----------
searchInput.addEventListener("input", applyFilters);
domainFilter.addEventListener("change", applyFilters);
$("controls").addEventListener("submit", e => e.preventDefault());
clearBtn.addEventListener("click", () => { searchInput.value = ""; domainFilter.value = "all"; applyFilters(); searchInput.focus(); });
navToggle.addEventListener("click", () => {
  navToggle.setAttribute("aria-expanded", String(mainNav.classList.toggle("open")));
});
mainNav.addEventListener("click", e => {
  if (e.target.tagName === "A") { mainNav.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); }
});

loadInternships();
