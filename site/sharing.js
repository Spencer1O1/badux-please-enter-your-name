/* Certificate images and sharing stay local until the applicant chooses to share. */
(() => {
  "use strict";

  function challengeURL() {
    const source = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const url = new URL(source, location.href);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/+$/, "");
  }

  function assistanceText(count) {
    return "Assistance requested: " + count + (count === 1 ? " time" : " times");
  }

  function resultText(result, url) {
    const assistance = assistanceText(result.assistanceCount);
    const link = url ? "\n" + url : "";
    return result.complete
      ? "I officially acquired the name “" + result.name + "”.\nTime: " + result.time + " · " + assistance + "\nEveryone else is still unregistered." + link
      : "Still trying to officially acquire the name “" + result.name + "”.\nStopped at department " + String(result.departmentNumber).padStart(2, "0") + " " + result.departmentName + " · " + assistance + "\nThink you can acquire yours?" + link;
  }

  function drawCertificate(result, url) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    // Use the live site's font stacks and colors, including the user's platform fonts.
    const theme = getComputedStyle(document.documentElement);
    const token = (name, fallback) => theme.getPropertyValue(name).trim() || fallback;
    const ink = token("--ink", "#242d2d"), muted = token("--muted", "#61675e");
    const mono = token("--mono", "monospace"), sans = token("--sans", "Arial, sans-serif");
    const nameNode = document.querySelector(".certificate-name");
    const stampNode = document.querySelector(".outcome-stamp");
    const sealNode = document.querySelector(".personal-seal");
    const serif = nameNode ? getComputedStyle(nameNode).fontFamily : "Georgia, serif";
    const stamp = stampNode ? getComputedStyle(stampNode).color : result.complete ? "#60712c" : "#a9412b";
    const seal = sealNode ? getComputedStyle(sealNode).color : stamp;
    const stampFamily = stampNode ? getComputedStyle(stampNode).fontFamily : mono;
    function line(value, y, size, family = mono, color = ink, width = 960, style = "") {
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const prefix = style ? style + " " : "";
      ctx.font = prefix + size + "px " + family;
      while (ctx.measureText(value).width > width && size > 12) ctx.font = prefix + --size + "px " + family;
      ctx.fillText(value, 600, y);
    }
    function stampLine(value, centerY, size, tracking, weight = "") {
      ctx.font = (weight ? weight + " " : "") + size + "px " + stampFamily;
      const metrics = ctx.measureText(value);
      const baseline = centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      const characters = [...value];
      const widths = characters.map(char => ctx.measureText(char).width);
      let x = -(widths.reduce((sum, width) => sum + width, 0) + tracking * (characters.length - 1)) / 2;
      ctx.textAlign = "left";
      characters.forEach((char, i) => { ctx.fillText(char, x, baseline); x += widths[i] + tracking; });
    }
    ctx.fillStyle = token("--cream", "#f3f0e5");
    ctx.fillRect(0, 0, 1200, 900);
    ctx.fillStyle = token("--paper", "#fffef8");
    ctx.fillRect(40, 40, 1120, 820);
    ctx.strokeStyle = "#a7ad94";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 820);
    ctx.strokeRect(51, 51, 1098, 798);
    // The seal shares the divider's left margin and centers between the two rules.
    const brand = "DEPARTMENT OF NAME ACQUISITION";
    const logoRadius = 34;
    const logoX = 100 + logoRadius, logoY = (51 + 162) / 2;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(logoX, logoY, logoRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = "left";
    ctx.font = "italic bold 52px " + serif;
    const logoMetrics = ctx.measureText("N");
    ctx.fillText("N", logoX + (logoMetrics.actualBoundingBoxLeft - logoMetrics.actualBoundingBoxRight) / 2, logoY + (logoMetrics.actualBoundingBoxAscent - logoMetrics.actualBoundingBoxDescent) / 2);
    line(brand, 101, 23, sans, ink, 960, "800");
    line(result.complete ? "CERTIFICATE OF NAME ACQUISITION" : "NOTICE OF UNSUCCESSFUL NAME ACQUISITION", 137, 15, mono, muted);
    ctx.strokeStyle = token("--line", "#d6d8c9");
    ctx.beginPath(); ctx.moveTo(100, 162); ctx.lineTo(1100, 162); ctx.stroke();
    line(result.complete ? "THIS CERTIFIES THAT" : "THIS OFFICE CONFIRMS THAT", 215, 17, mono, muted);
    line(result.name, 296, 74, serif, ink, 960, "italic");
    line(result.complete ? "HAS OFFICIALLY ACQUIRED A NAME." : "REMAINS UNREGISTERED.", 347, 19);
    ctx.save();
    ctx.translate(600, 465); ctx.rotate(-7 * Math.PI / 180);
    ctx.strokeStyle = stamp; ctx.fillStyle = stamp;
    ctx.lineWidth = 3; ctx.strokeRect(-220, -59, 440, 118);
    ctx.lineWidth = 1; ctx.strokeRect(-213, -52, 426, 104);
    stampLine(result.complete ? "APPROVED" : "DENIED", -12, 60, 0, "bold");
    stampLine(result.complete ? "OFFICIALLY NAMED. AT LAST." : "NAME ACQUISITION REJECTED.", 30, 14, 2.5);
    ctx.restore();
    line(result.complete ? "ACQUISITION TIME" : "DEPARTMENT REACHED", 588, 17, mono, muted);
    line(result.complete ? result.time : String(result.departmentNumber).padStart(2, "0") + " · " + result.departmentName, 637, 39);
    line(assistanceText(result.assistanceCount), 679, 19, sans, muted);
    line(result.complete ? "Everyone else remains unregistered." : "Officially unofficial until further notice.", 721, 20, sans, muted, 720);
    // Pair a smaller personal seal with the department emblem in the header band.
    ctx.save(); ctx.translate(1062, logoY); ctx.rotate(7 * Math.PI / 180);
    ctx.strokeStyle = seal; ctx.fillStyle = seal;
    ctx.lineWidth = 2; ctx.strokeRect(-35, -25, 70, 50);
    ctx.lineWidth = 1; ctx.strokeRect(-31, -21, 62, 42);
    if (result.complete && result.glyphs) {
      result.glyphs.forEach((glyph, i) => glyph.forEach((row, y) => row.forEach((filled, x) => {
        if (filled) ctx.fillRect(-27.5 + (i * 6 + x) * 5, -17.5 + y * 5, 5, 5);
      })));
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = token("--line", "#d6d8c9");
    ctx.beginPath(); ctx.moveTo(100, 763); ctx.lineTo(1100, 763); ctx.stroke();
    line("Acquire your own name.", 801, 23, serif);
    const address = url ? new URL(url) : null;
    const displayURL = address ? address.host + address.pathname.replace(/index\.html$/, "").replace(/\/+$/, "") : "Department of Name Acquisition";
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
      const url = challengeURL();
      if (!url) { feedback.textContent = "Open the hosted game to refer a friend."; return; }
      await copyTo(url, feedback, field, "Link copied.");
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
    section.querySelector("#challenge-friend").addEventListener("click", () => {
      if (url) copy(url, "Challenge link copied.");
      else say("Open the hosted game to share a challenge link.");
    });
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
      const data = { title: "Department of Name Acquisition", text };
      if (url) data.url = url;
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
