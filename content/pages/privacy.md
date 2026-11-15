---
title: "Privacy Policy & Cookies"
slug: privacy
type: page
status: published
summary: "Privacy Policy and Cookie Notice explaining how Clarteon, an unincorporated founding technology team in the Republic of the Philippines, collects, processes, stores, and protects personal data."
tags:
  - privacy policy
  - cookie policy
  - data protection
  - Philippines
  - Data Privacy Act
  - personal information
  - retention
synonyms:
  - data privacy
  - cookies
  - RA 10173
  - privacy notice
  - cookie preferences
seoTitle: "Privacy Policy & Cookies"
seoDescription: "How Clarteon collects personal data, uses strictly essential and visitor preference cookies, and handles removal requests in the Philippines."
hero:
  eyebrow: "Legal"
  title: "Privacy Policy & Cookies"
  intro: "How Clarteon collects, processes, retains, and safeguards personal information across this website, project briefs, discovery-call bookings, cookies, and Clara."
---
Effective date: November 15, 2026

## 1. Entity status and scope

This Privacy Policy and Cookie Notice ("Policy") explains how Clarteon ("we", "us", "our") collects, uses, stores, discloses, and protects information when you visit this website, submit a project brief, schedule a discovery call, or interact with Clara, our automated AI assistant.

Clarteon currently operates as an unincorporated founding technology team based in the Republic of the Philippines prior to formal corporate registration. Contact and data privacy inquiries may be directed to our designated point of contact at info@clarteon.tech. Where applicable, our handling of personal data is structured with reference to the principles of transparency, legitimate purpose, and proportionality under the Data Privacy Act of 2012 of the Republic of the Philippines (Republic Act No. 10173) and its Implementing Rules and Regulations.

## 2. Information we collect and purposes of processing

### a. Project brief submissions

When you submit a project brief form, we collect your full name, email address, optional company name, optional team size, and project description, together with the submission timestamp and verification signal returned by Cloudflare Turnstile.

- **Purpose:** We process this information strictly to evaluate your inquiry, respond to your request, protect the submission endpoint from automated abuse, and maintain records of prospective engagements.
- **Database-first persistence:** Brief records are persisted in our database before notification emails are transmitted so inquiries are not silently dropped if an email provider experiences a temporary outage.

### b. Discovery-call scheduling

When you book a discovery call, we collect your name, email address, selected date and start time, timezone selection, and optional discussion notes.

- **Purpose:** We process this information to check schedule availability, prevent overlapping bookings, issue a Google Calendar invitation and Google Meet conference link, send confirmation receipts, and conduct the scheduled call.

### c. Clara, our AI assistant

Clara is an automated artificial intelligence assistant integrated into this website. When you interact with Clara:

- Conversation messages sent during an active session are transmitted to our inference provider, Groq, solely to generate responses. According to Groq's published privacy documentation, inputs and outputs are not retained by default for model training and may be temporarily buffered for up to thirty (30) days for operational reliability and abuse prevention.
- Clarteon does not store full chat transcripts in our lead database.
- When Clara cannot answer an inquiry from published site content, an anonymized summary of the question—stripped of names, email addresses, and identifying details—is logged internally so our team can review content gaps and improve published documentation.
- **Voice input and speech synthesis:** If you grant microphone permission to use voice input, your audio recording is transmitted transiently to Groq solely for speech-to-text transcription and is not saved by Clarteon. You may review and edit the resulting text before submitting it. If you trigger the Read aloud feature, your browser's local speech synthesis engine speaks the displayed message directly on your device without uploading audio to Clarteon.
- **Sensitive data prohibition:** Do not submit passwords, payment card details, bank credentials, government-issued identification numbers, health records, or confidential third-party proprietary information to Clara.

## 3. Cookie notice and preference management

This website implements a layered cookie model restricted to **Strictly Essential** mechanisms and optional **Visitor Preference** storage. We do not deploy advertising pixels, cross-site tracking cookies, or third-party behavioral profiling scripts.

### a. Strictly essential cookies and security tokens

Strictly essential storage is necessary for website security, session continuity, fraud prevention, and honoring your stated consent preference. These mechanisms operate automatically upon use of the relevant feature and cannot be disabled without impairing site functionality:

- **`clarteon_cookie_consent`:** Stores your saved cookie consent selection (`essential` or `all`) for one hundred eighty (180) days (`SameSite=Lax`, path `/`).
- **`clarteon_chat`:** Signed `HttpOnly` session cookie scoped strictly to `/api/chat` (`SameSite=Lax`) used to maintain conversation context during an active browser visit and enforce fair-use message quotas.
- **`clarteon_admin`:** Signed `HttpOnly` session cookie (`SameSite=Lax`) set exclusively when an authorized team administrator signs into the protected `/admin` portal. Visitors who do not sign in as administrators never receive this cookie.
- **Cloudflare Turnstile tokens:** Ephemeral human-verification challenges executed when initializing chat, submitting project briefs, or booking calls to mitigate automated spam and abuse.

### b. Optional visitor preference cookies

Visitor preference cookies remember non-identifying interface selections only if you choose **Allow preference cookies** in our cookie banner or cookie preferences panel:

- **`clarteon_timezone`:** Remembers the display timezone you manually choose in the discovery-call booking scheduler for one hundred eighty (180) days (`SameSite=Lax`, path `/`) so returning visits pre-select your preferred scheduling timezone.

If you choose **Essential only**, `clarteon_timezone` is neither read as a saved preference nor written, and any previously stored `clarteon_timezone` cookie is cleared immediately. You may review or update your selection at any time via the **Cookie preferences** control in the website footer.

### c. Cookieless website analytics

We use Cloudflare Web Analytics to measure aggregate page traffic, referral counts, and Core Web Vitals performance metrics. Cloudflare Web Analytics operates strictly without cookies, does not employ browser fingerprinting, and does not follow individual visitors across external websites. Clarteon reviews only aggregate page-level metrics rather than individual visitor profiles.

## 4. Third-party infrastructure and data transfers

To deliver website functionality without operating custom mail, database, calendar, or model-hosting servers, Clarteon relies on specialized third-party subprocessors, each of which may process data on infrastructure located outside the Republic of the Philippines:

- **Vercel:** Web application hosting, content delivery, and serverless request execution.
- **Neon:** Managed PostgreSQL database hosting for project briefs, booking records, anonymized question logs, and site configuration.
- **Resend:** Transactional email delivery for project brief receipts, team alerts, and booking confirmations.
- **Google (Google Calendar & Google Meet):** Automated calendar availability checks, event creation, and meeting invitations when a visitor books a call.
- **Cloudflare (Turnstile & Web Analytics):** Bot mitigation and cookieless aggregate performance measurement.
- **Groq:** Real-time text inference and transient speech-to-text transcription for Clara.

Each provider processes only the minimum data required to perform its technical function and acts subject to its own security controls and published privacy terms.

## 5. Data retention and minimization

- **Project briefs:** Retained in our lead database for up to twelve (12) months from submission, after which records are scheduled for deletion or anonymization unless an ongoing engagement or statutory obligation requires continued retention.
- **Discovery-call bookings:** Retained only for as long as reasonably necessary to coordinate, conduct, and follow up on the scheduled meeting, unless superseded by a written client contract or legal retention requirement.
- **Anonymized unanswered chat logs:** Retained strictly for documentation maintenance without personal identifiers.

We practice data minimization in application logs by excluding full form bodies, personal emails, and chat payloads from routine server diagnostics.

## 6. Children and minors

This website and its inquiry, booking, and AI chat services are intended strictly for business and adult use. Individuals under eighteen (18) years of age must not submit personal information, schedule calls, or use Clara. If we become aware that personal data of a minor has been submitted inadvertently, we will delete it promptly upon notice.

## 7. Your rights and requests

Subject to applicable law and technical feasibility, you may request access to, correction of, or deletion of personal information you have submitted through our project brief or discovery-call forms, or withdraw consent to future non-essential processing.

To submit a privacy, access, or deletion request, email **info@clarteon.tech** from the email address associated with your submission or include sufficient information to locate your record. A member of our team will respond directly.

## 8. Amendments to this policy

We may update this Policy from time to time to reflect technical changes, new service providers, or updates after incorporation and formal counsel review. The current effective date appears at the top of this page.

## 9. Legal review notice

This document is prepared in good faith as a transparent, operational policy reflecting Clarteon's actual website behavior prior to incorporation. It is subject to final review and formal approval by a qualified lawyer admitted to practice in the Republic of the Philippines and does not constitute legal advice.
