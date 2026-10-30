/* Certificate images and sharing stay local until the applicant chooses to share. */
(() => {
  "use strict";

  function challengeURL() {
    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    return url.href;
  }

  function resultText(result, url) {
    const assistance = "Assistance requested: " + result.assistanceCount;
    return result.complete
      ? "I officially acquired the name “" + result.name + "”.\nTime: " + result.time + " · " + assistance + "\nEveryone else is still unregistered.\n" + url
      : "Still trying to officially acquire the name “" + result.name + "”.\nStopped at " + String(result.departmentNumber).padStart(2, "0") + " " + result.departmentName + " · " + assistance + "\nThink you can acquire yours?\n" + url;
  }

  function drawCertificate(result, url) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    const ink = "#242d2d", muted = "#61675e";
    const stamp = result.complete ? "#60712c" : "#a9412b";
    const mono = '"Courier New", monospace';
    function line(value, y, size, family = mono, color = ink, width = 960) {
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      const style = family.startsWith("italic ") ? "italic " : "";
      const face = family.replace(/^italic /, "");
      ctx.font = style + size + "px " + face;
      while (ctx.measureText(value).width > width && size > 12) ctx.font = style + --size + "px " + face;
      ctx.fillText(value, 600, y);
    }
    ctx.fillStyle = "#f3f0e5";
    ctx.fillRect(0, 0, 1200, 900);
    ctx.fillStyle = "#fffef8";
    ctx.fillRect(40, 40, 1120, 820);
    ctx.strokeStyle = "#a7ad94";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 820);
    ctx.strokeRect(51, 51, 1098, 798);
    line("DEPARTMENT OF NAME ACQUISITION", 101, 23);
    line(result.complete ? "CERTIFICATE OF NAME ACQUISITION" : "NOTICE OF UNSUCCESSFUL NAME ACQUISITION", 137, 15, mono, muted);
    ctx.strokeStyle = "#d6d8c9";
    ctx.beginPath(); ctx.moveTo(100, 162); ctx.lineTo(1100, 162); ctx.stroke();
    line(result.complete ? "THIS CERTIFIES THAT" : "THIS OFFICE CONFIRMS THAT", 215, 17, mono, muted);
    line(result.name, 301, 74, "italic Georgia, serif");
    line(result.complete ? "HAS OFFICIALLY ACQUIRED A NAME." : "REMAINS UNREGISTERED.", 350, 25, "Georgia, serif");
    ctx.save();
    ctx.translate(600, 444); ctx.rotate(-7 * Math.PI / 180);
    ctx.strokeStyle = stamp; ctx.fillStyle = stamp;
    ctx.lineWidth = 3; ctx.strokeRect(-220, -59, 440, 118);
    ctx.lineWidth = 1; ctx.strokeRect(-213, -52, 426, 104);
    ctx.font = "bold 62px " + mono; ctx.textAlign = "center";
    ctx.fillText(result.complete ? "APPROVED" : "MISSED", 0, 5);
    ctx.font = "15px " + mono;
    ctx.fillText(result.complete ? "OFFICIALLY NAMED. AT LAST." : "NAME ACQUISITION DENIED.", 0, 34);
    ctx.restore();
    line(result.complete ? "ACQUISITION TIME" : "DEPARTMENT REACHED", 572, 17, mono, muted);
    line(result.complete ? result.time : String(result.departmentNumber).padStart(2, "0") + " · " + result.departmentName, 625, 39);
    line("Assistance requested: " + result.assistanceCount, 667, 20, mono, muted);
    line(result.complete ? "The rest of you remain unregistered." : "Please remain unofficial until further notice.", 721, 21, "Georgia, serif", muted, 720);
    // The applicant's pixel seal keeps its own corner, as on the on-page certificate.
    ctx.save(); ctx.translate(1040, 709); ctx.rotate(7 * Math.PI / 180);
    ctx.strokeStyle = stamp; ctx.fillStyle = stamp;
    ctx.lineWidth = 2; ctx.strokeRect(-52, -42, 104, 84);
    ctx.lineWidth = 1; ctx.strokeRect(-47, -37, 94, 74);
    if (result.complete && result.glyphs) {
      result.glyphs.forEach((glyph, i) => glyph.forEach((row, y) => row.forEach((filled, x) => {
        if (filled) ctx.fillRect(-38.5 + (i * 6 + x) * 7, -24.5 + y * 7, 7, 7);
      })));
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-19, -19); ctx.lineTo(19, 19); ctx.moveTo(19, -19); ctx.lineTo(-19, 19); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#d6d8c9";
    ctx.beginPath(); ctx.moveTo(100, 763); ctx.lineTo(1100, 763); ctx.stroke();
    line("Acquire your own name.", 801, 23, "Georgia, serif");
    const address = new URL(url);
    const displayURL = address.protocol === "file:" ? "Department of Name Acquisition" : address.host + address.pathname.replace(/index\.html$/, "");
    line(displayURL, 830, 18, mono, muted);
    return canvas;
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch { /* The selectable fallback also works where clipboard access is blocked. */ }
    const previous = document.activeElement;
    const field = document.createElement("textarea");
    field.value = value;
    field.readOnly = true;
    field.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { /* Offer manual copying below. */ }
    field.remove();
    previous?.focus({ preventScroll: true });
    return copied;
  }

  async function copyTo(value, feedback, field, success) {
    field.hidden = true;
    feedback.textContent = "";
    if (await copyText(value)) feedback.textContent = success;
    else {
      field.value = value;
      field.hidden = false;
      field.focus({ preventScroll: true }); field.select();
      feedback.textContent = "Copy the text below.";
    }
  }

  function mountReferral(root) {
    const button = root.querySelector("#refer-friend");
    const feedback = root.querySelector("#referral-feedback");
    const field = root.querySelector("#referral-copy-field");
    let feedbackTimer = null;
    const dismiss = () => { field.hidden = true; feedback.textContent = ""; };
    field.addEventListener("blur", dismiss);
    field.addEventListener("keydown", event => {
      if (event.key === "Escape") { dismiss(); button.focus({ preventScroll: true }); }
    });
    button.addEventListener("click", async () => {
      clearTimeout(feedbackTimer);
      await copyTo(challengeURL(), feedback, field, "Link copied.");
      if (field.hidden) feedbackTimer = setTimeout(() => { feedback.textContent = ""; }, 3500);
    });
  }

  function mount(root, result) {
    const url = challengeURL();
    const text = resultText(result, url);
    const section = document.createElement("section");
    section.className = "certificate-sharing";
    section.setAttribute("aria-label", "Share your name acquisition result");
    section.innerHTML = '<p class="sharing-title">Know an unregistered friend?</p><div class="sharing-actions"><button class="secondary-button" id="share-certificate" type="button" disabled>Share certificate</button><button class="secondary-button" id="save-certificate" type="button" disabled>Save certificate</button><button class="text-button" id="copy-result" type="button">Copy result</button><button class="text-button" id="challenge-friend" type="button">Challenge a friend</button></div><p class="sharing-feedback" role="status" aria-live="polite" aria-atomic="true"></p><textarea class="sharing-copy-field" aria-label="Text to copy" readonly hidden></textarea>';
    root.append(section);
    const feedback = section.querySelector(".sharing-feedback");
    const field = section.querySelector(".sharing-copy-field");
    const share = section.querySelector("#share-certificate");
    const save = section.querySelector("#save-certificate");
    let imageBlob = null;
    const filename = result.complete ? "official-name-certificate.png" : "unregistered-name-notice.png";
    const say = value => { feedback.textContent = value; };
    const copy = (value, success) => copyTo(value, feedback, field, success);
    section.querySelector("#copy-result").addEventListener("click", () => copy(text, "Result copied."));
    section.querySelector("#challenge-friend").addEventListener("click", () => copy(url, "Challenge link copied."));
    save.addEventListener("click", () => {
      if (!imageBlob) return;
      const imageURL = URL.createObjectURL(imageBlob);
      const link = document.createElement("a");
      link.href = imageURL; link.download = filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(imageURL), 30000);
      say("Download started.");
    });
    share.addEventListener("click", async () => {
      field.hidden = true;
      say("");
      if (!navigator.share) {
        await copy(text, "Result copied. Save the certificate to share its image.");
        return;
      }
      const data = { title: "Department of Name Acquisition", text, url };
      try {
        if (imageBlob) {
          const file = new File([imageBlob], filename, { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) data.files = [file];
        }
        await navigator.share(data);
      } catch (error) {
        if (error.name !== "AbortError") await copy(text, "Result copied. Save the certificate to share its image.");
      }
    });
    // Prepare the image before a click so native sharing retains user activation.
    try {
      drawCertificate(result, url).toBlob(blob => {
        if (!blob) { share.disabled = false; say("Image unavailable. You can still copy your result."); return; }
        imageBlob = blob;
        share.disabled = false; save.disabled = false;
      }, "image/png");
    } catch {
      share.disabled = false;
      say("Image unavailable. You can still copy your result.");
    }
  }

  NameOffice.sharing = Object.freeze({ mount, mountReferral, challengeURL, resultText, drawCertificate });
})();
