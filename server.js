import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = join(process.cwd(), "public");

const systemPrompt = `You are AI Coder Studio, an expert software architect and code generator.
Goal: create production-ready starter projects from user requirements.
Rules:
1) Ask for missing critical requirements briefly.
2) Output concise architecture + folder structure.
3) Generate complete code files with fenced blocks and clear filenames.
4) Include setup steps and run commands.
5) If user asks for game, produce playable browser game starter.
6) Prefer secure defaults and explain trade-offs.`;

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function localFallback(prompt) {
  const idea = prompt.toLowerCase();
  const isGame = /(game|2d|3d|arcade|platformer|puzzle)/.test(idea);

  if (isGame) {
    return {
      model: "local-fallback-template",
      output: `## Plan\n- Build a playable browser game with HTML/CSS/JS\n- Add scoring, restart button, and keyboard controls\n\n## Files\n\n### index.html\n\n\`\`\`html\n<!doctype html>\n<html>\n<head><meta charset="utf-8"/><title>Prompt Game</title><link rel="stylesheet" href="style.css"></head>\n<body>\n  <h1>Prompt Runner</h1>\n  <canvas id="game" width="800" height="400"></canvas>\n  <button onclick="location.reload()">Restart</button>\n  <script src="game.js"></script>\n</body>\n</html>\n\`\`\`\n\n### game.js\n\n\`\`\`js\nconst c=document.getElementById('game');const x=c.getContext('2d');let p={x:80,y:320,vy:0};\nlet obs=[],score=0,alive=true;\naddEventListener('keydown',e=>{if(e.code==='Space'&&p.y>=320)p.vy=-12;});\nsetInterval(()=>obs.push({x:800,w:30,h:40+Math.random()*40}),1200);\nfunction loop(){x.clearRect(0,0,800,400);p.vy+=0.6;p.y=Math.min(320,p.y+p.vy);\nx.fillRect(0,p.y,30,30);obs.forEach(o=>{o.x-=6;x.fillRect(o.x,360-o.h,o.w,o.h);if(o.x<110&&o.x+o.w>80&&p.y+30>360-o.h)alive=false;});\nobs=obs.filter(o=>o.x>-60);if(alive){score++;requestAnimationFrame(loop);}x.fillText('Score '+score,20,20);}loop();\n\`\`\`\n\nRun with any static server.`
    };
  }

  return {
    model: "local-fallback-template",
    output:
      "I can generate this app for you. Please confirm:\n1) Target platform (web/mobile/backend)\n2) Preferred stack (React, Node, Python, etc.)\n3) Auth + database needs\n\nOnce confirmed, I will return full project files and run steps instantly."
  };
}

async function callOpenAI(userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return localFallback(userPrompt);

  const body = {
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${details}`);
  }

  const data = await response.json();
  return {
    model: data.model,
    output: data.choices?.[0]?.message?.content || "No response received."
  };
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safe = normalize(requestedPath).replace(/^\.\.(\/|\\|$)+/, "");
  const filePath = join(PUBLIC_DIR, safe);

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "text/plain" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/api/health")) {
    return json(res, 200, { ok: true, service: "ai-coder-studio" });
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) req.destroy();
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(raw || "{}");
        if (!parsed.prompt || typeof parsed.prompt !== "string") {
          return json(res, 400, { error: "Prompt is required." });
        }

        try {
          const result = await callOpenAI(parsed.prompt);
          return json(res, 200, {
            id: randomUUID(),
            ...result,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          return json(res, 500, {
            error: "Generation failed",
            details: error.message,
            fallback: localFallback(parsed.prompt)
          });
        }
      } catch {
        return json(res, 400, { error: "Invalid JSON body." });
      }
    });
    return;
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`AI Coder Studio running on http://localhost:${PORT}`);
});
