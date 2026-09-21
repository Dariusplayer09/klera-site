/* Early-access signup.

   Posts straight to Supabase PostgREST with the publishable key. There is no backend and
   no third-party form service. The key can insert and nothing else (supabase/waitlist.sql),
   so the worst a visitor can do with it is add a row.

   If the key is missing the form does not pretend to work: it swaps itself for a mailto
   link, because a form that silently drops signups is worse than no form. */
(() => {
  const form = document.getElementById("waitlist-form");
  if (!form) return;

  const cfg = window.KLERA || {};
  const status = document.getElementById("waitlist-status");
  const submit = form.querySelector("button[type=submit]");

  const say = (msg, state) => {
    status.textContent = msg;
    status.dataset.state = state || "";
  };

  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    say(`Signups are not wired up yet. Email ${cfg.contactEmail || "us"} and we will add you by hand.`, "err");
    submit.disabled = true;
    return;
  }

  let sent = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sent) return;

    const data = new FormData(form);
    /* Honeypot. Real people leave it empty; a bot fills every field it finds. We report
       success either way so the bot learns nothing, and simply do not post the row. */
    if (data.get("company")) {
      say("You are on the list. Watch your inbox.", "ok");
      return;
    }

    const email = String(data.get("email") || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      say("That email does not look right. Check it and try again.", "err");
      form.querySelector("#wl-email").focus();
      return;
    }

    const row = {
      email,
      name: String(data.get("name") || "").trim().slice(0, 120) || null,
      role: data.get("role") || "student",
      device: data.get("device") || "unsure",
      note: String(data.get("note") || "").trim().slice(0, 500) || null,
      source: "site",
    };

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

      if (res.ok) {
        sent = true;
        form.hidden = true;
        say("You are in. Your lifetime Klera Premium is reserved against this email, and we will write when the first build is ready to hand out.", "ok");
        return;
      }

      /* 409 is the unique index on lower(email): this address already signed up. That is
         a good outcome for the visitor, not an error. */
      if (res.status === 409) {
        sent = true;
        form.hidden = true;
        say("This email is already on the list, and your lifetime Premium is already reserved. Nothing else to do.", "ok");
        return;
      }

      const body = await res.text();
      console.error("[waitlist]", res.status, body);
      say(`Something went wrong on our side (${res.status}). Email ${cfg.contactEmail} and we will add you by hand.`, "err");
      submit.disabled = false;
    } catch (err) {
      console.error("[waitlist]", err);
      say(`Could not reach the server. Check your connection, or email ${cfg.contactEmail}.`, "err");
      submit.disabled = false;
    }
  });
})();
