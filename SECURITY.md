# Security Policy

This document serves two purposes. It is an **honest internal record of ProPrompt's security posture** — what we run, what we store, and where the risk genuinely sits — and it is our **public responsible-disclosure policy** for security researchers.

ProPrompt (stylized **PRO·PROMPT**) is a free web app offering 2,260+ original AI prompts with instant search, a fill-in-the-blanks customizer, one-click copy, and "Run in ChatGPT / Claude / Gemini" buttons. It operates as an independent brand; security contact: hello@getproprompt.com.

- **Website:** https://getproprompt.com
- **Security contact:** hello@getproprompt.com
- **Last reviewed:** June 29, 2026

---

## 1. Security model

ProPrompt is a **static website hosted on our static hosting**. This is the single most important fact about our security posture, because it shrinks the attack surface to almost nothing.

What this means in concrete terms:

- **No backend.** There is no application server we run, so there is no server-side code to exploit, no request handler to inject into, and no runtime we have to patch.
- **No database.** We do not operate a database. There is no store of user records to breach, dump, or ransom.
- **No user accounts.** There is no login, no session, no password, and no authentication system. There are no credentials for an attacker to steal, phish, or brute-force, and no account-takeover risk because there are no accounts.
- **No server-side code execution.** The site is plain HTML, CSS, and client-side JavaScript served as static files. There is no SSRF, no server-side template injection, no command injection, and no insecure deserialization surface, because nothing executes on a server we control.

**What risk remains.** Eliminating the backend does not make the site risk-free; it changes *where* the risk lives:

- **Client-side risk.** The main residual application risk is in the front-end code itself — primarily cross-site scripting (XSS) if untrusted content were ever rendered unsafely into the DOM. Because our content is authored by us and the customizer only fills user text into prompt templates that are copied to the clipboard (not executed), this surface is small, but it is the surface we watch most closely.
- **Supply-chain risk.** Any third-party JavaScript or CDN dependency we include runs with full access to the page. See [Section 8](#8-supply-chain-notes).
- **Platform / account risk.** The integrity of the site depends on our our hosting account, our domain registrar/DNS, and the our static hosting platform. Compromise of those would let an attacker alter what visitors receive. We treat the security of those accounts (strong unique credentials, MFA) as part of our threat model.
- **Third-party services.** Payments, newsletter, and analytics are handled by external providers (see Sections 3 and 2). Their security is governed by their own programs; we minimize what we hand to them.

---

## 2. Data handling

ProPrompt is built to collect as close to nothing as possible.

**What is NOT stored by ProPrompt:**

- We have no backend and no database, so we do **not** store any visitor data on our side.
- We do not create user accounts, so there are no profiles, emails, or passwords held by the app.

**What stays on the visitor's own device:**

- A small amount of **preference data** — such as recently-used prompts and theme choice — is stored **only in the visitor's browser via `localStorage`**. This data never leaves the device, is never transmitted to us, and can be cleared by the visitor at any time through their browser settings.

**Third-party data touchpoints (clearly delineated):**

- **Newsletter sign-ups** are **optional** and are handled by a **third-party email provider**. If a visitor chooses to subscribe, the email address they provide is processed by that provider under its own terms and privacy policy.
- **Site analytics** are **privacy-friendly / cookieless** and do not track individuals across sites.
- **Payments** are handled entirely by Lemon Squeezy (see [Section 3](#3-payments)).

**Regulatory note.** Our audience is global with a focus on the US and UK. We treat **GDPR (UK/EU)** and **CCPA/CPRA (California)** as applicable. Because ProPrompt itself holds no personal data, most data-subject requests concerning purchases or newsletter sign-ups are fulfilled through the relevant processor (Lemon Squeezy or the email provider). Questions can be sent to hello@getproprompt.com.

---

## 3. Payments

ProPrompt offers a paid **"ProPrompt Pro"** tier as a one-time Lifetime purchase. All payment processing is delegated to **Lemon Squeezy**.

- **Lemon Squeezy is the Merchant of Record (MoR).** It handles billing, refunds, and sales tax / VAT (including for US/UK/EU) on our behalf.
- **Lemon Squeezy is PCI-DSS compliant.** Card data is captured and processed within their compliant environment.
- **ProPrompt never sees or stores card data.** Card numbers, CVCs, and full payment credentials never touch our static site or any system we operate. We have no cardholder data environment to secure because we never receive cardholder data.

This arrangement means the highest-sensitivity data in the whole product — payment information — is kept entirely off ProPrompt's infrastructure.

---

## 4. Transport security

- **HTTPS is enforced** by our static hosting for `getproprompt.com`.
- our static hosting provisions and **auto-renews the TLS certificate**, so there is no manual certificate-renewal step that could lapse.
- We recommend keeping the **"Enforce HTTPS"** setting enabled in the our static hosting configuration so that any HTTP request is redirected to HTTPS.

**Recommended hardening — HSTS.** We recommend enabling **HTTP Strict Transport Security (HSTS)** so browsers refuse to connect over plaintext HTTP after the first visit. Because our static hosting cannot set custom response headers (see [Section 5](#5-recommended-http-security-headers)), HSTS in practice requires fronting the site with a proxy such as Cloudflare. A reasonable starter header is:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Only add `preload` once you are confident every subdomain will be served over HTTPS indefinitely, since preload-list removal is slow.

---

## 5. Recommended HTTP security headers

These headers are part of our target hardening posture. They reduce the impact of XSS, clickjacking, MIME-sniffing, and referrer leakage.

> **Important platform constraint:** **our static hosting cannot set custom HTTP response headers.** You cannot configure these headers from the our static hosting settings or from any file in the repository. The two practical options are:
>
> 1. **Content-Security-Policy via a `<meta http-equiv>` tag** in the HTML `<head>` — this is the one header that *can* be delivered without a proxy (note: `frame-ancestors`, `report-uri`, and a few directives are **ignored** when CSP is set via `<meta>`, so clickjacking protection still needs option 2).
> 2. **Proxy the site through Cloudflare** (point DNS at Cloudflare and enable the proxy) and use **Transform Rules → Response Header rules** to add CSP, HSTS, and the remaining headers as real HTTP response headers.

### Content-Security-Policy

A sensible **starter policy** for this site (a static prompt vault with optional embedded "Run in…" links and possibly a CDN script or two). Tighten it to match exactly what the site loads — every external origin you actually use must be listed, and nothing more.

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';
  img-src 'self' data:;
  style-src 'self';
  font-src 'self';
  script-src 'self';
  connect-src 'self';
  form-action 'self';
  upgrade-insecure-requests
```

Notes for tuning this policy:

- **Avoid `'unsafe-inline'` and `'unsafe-eval'`.** If the site currently relies on inline `<script>` or inline event handlers, prefer moving them into external files or adding per-tag **nonces/hashes** rather than weakening the policy.
- If you load a script from a CDN, add that exact origin to `script-src` **and** pin it with Subresource Integrity (see [Section 8](#8-supply-chain-notes)).
- If the newsletter form or analytics beacon posts to a third-party origin, add that origin to `connect-src` and/or `form-action` as needed — keep the list minimal.
- The `"Run in ChatGPT / Claude / Gemini"` buttons should open those destinations via normal top-level navigation (links), not by embedding them in frames, so they do not require `frame-src` entries.

### Other recommended headers

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
X-Frame-Options: DENY
```

- **`X-Content-Type-Options: nosniff`** — stops browsers from MIME-sniffing responses into an unexpected content type.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — sends the full URL only on same-origin requests and just the origin cross-origin, limiting referrer leakage.
- **`Permissions-Policy`** — disables powerful browser features the site does not use (camera, mic, geolocation, payment APIs, USB). The legacy `interest-cohort=()` opt-out is harmless to include.
- **`X-Frame-Options: DENY`** plus CSP **`frame-ancestors 'self'`** — defense in depth against clickjacking. `frame-ancestors` is the modern mechanism; `X-Frame-Options` covers older browsers. Both must be set as real response headers (Cloudflare), since `frame-ancestors` is ignored in a `<meta>` CSP and `X-Frame-Options` cannot be set via `<meta>` at all.

---

## 6. `security.txt`

We recommend publishing a machine-readable disclosure policy at **`/.well-known/security.txt`** (and, for static-host compatibility, optionally also at `/security.txt`). Suggested contents:

```
Contact: mailto:hello@getproprompt.com
Expires: 2027-06-29T00:00:00.000Z
Preferred-Languages: en
Canonical: https://getproprompt.com/.well-known/security.txt
Policy: https://getproprompt.com/SECURITY.md
```

Update the `Expires` field before it lapses (current value: **2027-06-29**). Per RFC 9116, an expired `security.txt` should not be relied upon, so refreshing it is part of routine maintenance. For best practice the file should ideally be served with a PGP signature, but an unsigned file is acceptable for a project of this size.

---

## 7. Responsible disclosure

We welcome reports from security researchers and will work with you in good faith.

### How to report

- **Email:** **hello@getproprompt.com**
- Please include: a clear description of the issue, the affected URL or component, step-by-step reproduction instructions, and any proof-of-concept (a screenshot or short snippet is ideal).
- Encrypted or sensitive details are welcome — note in your first email if you'd like to arrange a secure channel.

### Scope

**In scope:**

- The ProPrompt website and its content at `https://getproprompt.com` and its subdomains.
- Client-side vulnerabilities such as XSS, content injection, clickjacking, or insecure handling of `localStorage` data.
- Misconfigurations of HTTPS, security headers, DNS, or the our static hosting / Cloudflare setup.

**Out of scope:**

- **Lemon Squeezy** (our payments Merchant of Record), our **newsletter email provider**, our **analytics provider**, our static hosting, Cloudflare, and any other third-party platform — please report issues in those systems directly to the respective vendor's security team.
- Findings that require physical access to a victim's unlocked device, social engineering of the operator, or compromised end-user machines.
- Volumetric denial-of-service / stress testing, automated scanner output without a demonstrated impact, missing "best-practice" headers reported without an exploit, and theoretical issues with no realistic attack path.
- Reports about the *content* of prompts (these are editorial, not security, matters).

### What to expect

As ProPrompt is run by a single independent operator, we cannot promise enterprise SLAs, but our intent is:

- **Acknowledgement** of your report within a few business days.
- A **good-faith assessment** and, where a fix is warranted, remediation as quickly as is practical for a static site.
- **Credit** for the discovery if you would like it, once any fix is live.

We do **not** currently run a paid bug-bounty program; we cannot offer monetary rewards at this time.

### Safe harbor

If you make a good-faith effort to comply with this policy during your research, we will consider your activity **authorized**, we will **not pursue or support legal action** against you, and we will work with you to understand and resolve the issue promptly. Good faith means: you act only against assets in scope, you avoid privacy violations and service degradation, you do not access, modify, or exfiltrate data beyond the minimum needed to demonstrate the issue, and you give us a reasonable opportunity to remediate before any public disclosure. If in doubt about whether an action is acceptable, ask us first at hello@getproprompt.com.

---

## 8. Supply-chain notes

Because the site runs entirely in the visitor's browser, any third-party JavaScript we ship executes with full access to the page. We treat the dependency chain as a primary risk area and apply the following practices:

- **Keep third-party JavaScript minimal.** Prefer first-party, self-hosted code. Every external script is something we deliberately justify, not a default. Fewer dependencies means fewer ways for the page to be compromised.
- **Self-host where practical.** Hosting a script from our own origin (rather than a CDN) removes a third-party trust dependency and keeps it inside a tight `script-src 'self'` policy.
- **Pin and verify any CDN scripts with Subresource Integrity (SRI).** When a CDN-hosted script is unavoidable, include an `integrity` hash and `crossorigin` attribute so the browser refuses to run a tampered file. Pin to an exact, immutable version — never to a "latest" or floating tag. Example:

  ```html
  <script
    src="https://cdn.example.com/lib@1.2.3/lib.min.js"
    integrity="sha384-<base64-hash>"
    crossorigin="anonymous"></script>
  ```

- **Review dependencies before adding them.** Check what a library actually does, its maintenance status, its own transitive dependencies, and its footprint. Remove anything unused.
- **Lock and audit build-time dependencies.** If a build toolchain is used, commit a lockfile and run periodic dependency audits so known-vulnerable packages are caught and updated.
- **Align CSP with the dependency list.** Every allowed origin in `script-src` / `connect-src` should correspond to a real, reviewed dependency. When a dependency is removed, remove its origin from the CSP too.
- **Protect the source of truth.** Because the deployed site is whatever is in our source repository, the security of the our hosting account and its access controls (strong unique password, MFA, limited collaborators) is part of supply-chain integrity.

---

*Questions about this policy? Contact hello@getproprompt.com.*
