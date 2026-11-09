/* Newsletter signup.

   Writes into the same Supabase table the early-access waitlist used (public.waitlist), so
   everyone who signed up before stays on the list. Newsletter rows are tagged note =
   'newsletter'. The row is shaped to pass the insert policy in supabase/waitlist.sql in both
   its old and its current version: role is never 'school-student' (which would require a
   parent email), page is 'home', source is 'site', consent is true.

   The publishable key can insert and nothing else, so a visitor cannot read the list back. */
(() => {
  "use strict";
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  const cfg = window.KLERA || {};
  const status = document.getElementById("newsletter-status");
  const submit = form.querySelector("button[type=submit]");
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const say = (msg, state) => {
    status.textContent = msg;
    status.dataset.state = state || "";
  };

  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    say(`Signups aren't wired up yet. Email ${cfg.contactEmail || "us"} and we'll add you.`, "err");
    submit.disabled = true;
    return;
  }

  let sent = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sent) return;
    const data = new FormData(form);

    /* Honeypot: people leave it empty, bots fill it. Report success, post nothing. */
    if (data.get("company")) { say("You're on the list.", "ok"); return; }

    const email = String(data.get("email") || "").trim();
    if (!EMAIL.test(email)) {
      say("That email doesn't look right. Check it and try again.", "err");
      form.querySelector("#nl-email").focus();
      return;
    }
    if (!data.get("consent")) {
      say("Tick the box so we're allowed to email you.", "err");
      form.querySelector("#nl-consent").focus();
      return;
    }

    const role = ["student", "parent", "teacher", "other"].includes(data.get("role")) ? data.get("role") : "student";
    const row = { email, role, device: "unsure", note: "newsletter", consent: true, page: "home", source: "site" };

    submit.disabled = true;
    say("Sending…");
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      });
      /* 409 = this address is already on the list (unique on lower(email)). Good outcome. */
      if (res.ok || res.status === 409) {
        sent = true;
        form.hidden = true;
        say(res.ok ? "You're on the list. We'll only write when there's something worth reading."
                   : "You're already on the list. Nothing else to do.", "ok");
        return;
      }
      console.error("[newsletter]", res.status, await res.text());
      say(`Something went wrong on our side (${res.status}). Email ${cfg.contactEmail} and we'll add you.`, "err");
      submit.disabled = false;
    } catch (err) {
      console.error("[newsletter]", err);
      say(`Couldn't reach the server. Check your connection, or email ${cfg.contactEmail}.`, "err");
      submit.disabled = false;
    }
  });
})();
