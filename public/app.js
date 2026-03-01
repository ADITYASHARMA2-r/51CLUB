const promptEl = document.getElementById("prompt");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");
const btn = document.getElementById("generateBtn");

async function generate() {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    statusEl.textContent = "Please enter a project idea first.";
    return;
  }

  btn.disabled = true;
  statusEl.textContent = "Generating...";
  outputEl.textContent = "";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (!res.ok) {
      outputEl.textContent =
        data?.fallback?.output || data?.details || "Something went wrong.";
      statusEl.textContent = "Used fallback template.";
      return;
    }

    outputEl.textContent = data.output;
    statusEl.textContent = `Done using ${data.model}`;
  } catch (error) {
    outputEl.textContent = `Request failed: ${error.message}`;
    statusEl.textContent = "Server error.";
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener("click", generate);
