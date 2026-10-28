# Please enter your name.

**One name. Four departments. An entirely avoidable amount of paperwork.**

A small, self-contained Bad UX competition game from the fictional Department of
Name Acquisition. Give it an invented name, speak in bureaucratic capitals,
surrender your vowels at customs, and identify yourself three times to receive a
very provisional certificate.

The game is intentionally petty, but always winnable. Each stage offers a hint,
keyboard controls work throughout, the application can be reset immediately, and
reduced-motion preferences are respected. There are no timers, popups, downloads,
permissions, analytics, external assets, fonts, network calls, cookies or browser
storage. Names exist only in the current page's memory. Please use a fictional
name; closing or resetting the page discards it. Hosting infrastructure may still
record ordinary HTTP access logs.

## Files and preview

`site/` contains plain HTML, CSS, a local SVG favicon and browser JavaScript. There
are no package dependencies, build steps, package hooks or project executables.
Open `site/index.html` directly in a browser, or serve that directory with an
ordinary static file server. All asset references are relative and self-contained.

The four stages are intake, capitalization, vowel customs and a text-only name
recognition grid. Hints reveal the answer; the last screen is a certificate within
the page, not a downloadable document. “Shred application” clears the current
application without saving anything.

## Publish to a Badux installation

1. Sign in to your chosen Badux installation and install its GitHub App on this
   public repository. This repository does not contain a Badux hostname or deploy
   secret.
2. Connect the repository and its `main` branch to a project in that installation.
   Project creation must be open. An owner may optionally enter an open collection.
3. Push a change to `main`. The maintained `.github/workflows/badux.yml` workflow
   checks that `site/index.html` is a nonempty regular file and uploads `site/` as
   the `badux-site` artifact. Badux validates it and publishes eligible updates
   automatically. A workflow artifact alone does not prove deployment; an
   installation and a connected project are required.

The workflow is copied from Badux's maintained plain-static template. It uses
immutable action revisions, a read-only repository token, checkout without
persisted credentials, and cancellation of superseded same-branch runs. There are
no platform secrets or registry commands. Keep the workflow aligned with the
installation's supported template when upgrading.

This is a competition fixture, not a real public service or a request for personal
information. “Approved” means only that you finished a browser game.
