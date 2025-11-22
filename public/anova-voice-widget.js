// anova-voice-widget.js
// Lightweight voice UI that connects to your Cloud Run backend

const BACKEND_URL = "/api/realtime-session";

export class AnovaWidget {
  constructor() {
    this.active = false;
    this.connecting = false;
    this.mount = document.getElementById("anova-widget-mount");
    if (this.mount) {
      this.init();
    }
  }

  init() {
    this.render();
    this.attach();
  }

  render() {
    this.mount.innerHTML = `
      <style>
        #anova-float {
          position:fixed;bottom:32px;right:32px;width:65px;height:65px;
          background:#111;border:1px solid rgba(255,255,255,.1);
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          cursor:pointer;box-shadow:0 15px 40px rgba(0,0,0,.45);transition:.3s;
          z-index:9999;
        }
        #anova-float:hover { transform:scale(1.08); border-color:#10B981; }

        #anova-float.active {
          width:300px;height:80px;border-radius:45px;
          backdrop-filter:blur(14px);background:rgba(10,10,10,0.9);
          border:1px solid #10B981;
          display:flex;justify-content:space-between;padding:0 20px;
        }

        .status { color:#fff;font-family:'Inter';font-size:.9rem;white-space:nowrap;display:none; }
        #anova-float.active .status { display:block; }

        .close { display:none;color:#AAA;font-size:1.3rem;padding:5px;cursor:pointer; }
        #anova-float.active .close { display:block; }

        .bars { display:none;gap:4px;align-items:center; }
        #anova-float.active .bars { display:flex; }

        .bar {
          width:4px;height:12px;background:#10B981;border-radius:2px;
          animation:sound 0ms -800ms linear infinite alternate;
        }
        @keyframes sound { 0%{height:12px;}100%{height:28px;} }
      </style>

      <div id="anova-float">
        <svg class="mic" viewBox="0 0 24 24" width="26" height="26" fill="#FFF">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>

        <div class="status">Connecting…</div>

        <div class="bars">
          <div class="bar"></div><div class="bar"></div><div class="bar"></div>
          <div class="bar"></div><div class="bar"></div>
        </div>

        <div class="close">✕</div>
      </div>
    `;

    this.el = document.getElementById("anova-float");
    this.status = this.el.querySelector(".status");
    this.bars = this.el.querySelectorAll(".bar");
  }

  attach() {
    this.el.addEventListener("click", (e) => {
      if (e.target.classList.contains("close")) {
        this.stop();
        return;
      }
      if (!this.active) this.start();
    });

    window.anovaTrigger = () => this.start();
    const btn = document.getElementById("trigger-voice-demo");
    if (btn) btn.onclick = () => this.start();
  }

  async start() {
    if (this.active || this.connecting) return;

    this.connecting = true;
    this.el.classList.add("active");
    this.status.innerText = "Connecting…";

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error(`Backend failed with status: ${response.status}`);

      const data = await response.json();
      console.log("Realtime session:", data);

      this.connecting = false;
      this.active = true;
      this.status.innerText = "Listening…";

      this.animation = setInterval(() => {
        this.bars.forEach(b => {
          b.style.animationDuration = `${Math.random()*300+150}ms`;
        });
      }, 500);

    } catch (err) {
      console.error(err);
      this.status.innerText = "Failed";
      setTimeout(() => this.stop(), 1500);
    }
  }

  stop() {
    this.active = false;
    this.connecting = false;
    if (this.animation) clearInterval(this.animation);
    this.el.classList.remove("active");
  }
}

new AnovaWidget();
