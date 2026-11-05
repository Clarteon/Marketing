---
title: "An AI business coach that cites clinic records and operating policies instead of guessing."
slug: v-unite-voice-ai-coach
type: case-study
status: published
publishedAt: "2026-11-05"
order: 2
category: "conversations"
categoryLabel: "AI agents & knowledge retrieval"
client: "V-Unite Aesthetic Clinic Operations MVP"
solution_type: "Voice and text AI agent connected to live metrics and company SOPs"
permission: "Approved by lead engineer Aldrei Santua on 2026-11-05"
image: "/images/work/v-unite-voice-ai-coach.webp"
imageAlt: "V-Unite Voice AI Coach dashboard showing live clinic conversion metrics, suggested operational questions, and voice input controls."
secondaryImage: "/images/work/v-unite-voice-ai-coach-workflow.webp"
secondaryImageAlt: "Automation workflow showing how the AI agent routes clinic questions between customer analytics databases and uploaded policy documents."
liveUrl: "https://v-unite-voice-ai-coach.vercel.app/"
summary: "Clinic owners asking why a treatment is underperforming need answers from their own numbers and staff handbooks. We built a voice and text AI coach that checks live clinic metrics and uploaded policies before answering, and shows its source on every reply."
seoTitle: "Voice and Text AI Coach for Aesthetic Clinics"
seoDescription: "An AI business coach for clinic owners that answers operational questions from live customer records and clinic SOPs, citing its source every time."
tags:
  - AI agent
  - business intelligence
  - knowledge base
  - voice assistant
  - workflow automation
  - operations coaching
synonyms:
  - internal AI assistant
  - company knowledge bot
  - clinic analytics
  - SOP assistant
  - voice AI
problemBrief: "Clinic owners had customer numbers in one database and consultation rules in separate PDF handbooks, and off-the-shelf AI chat tools invented advice when asked how the two connected."
approachBrief: "We built a voice-and-text coaching assistant where an automation workflow checks live customer metrics, searches uploaded clinic policies, or combines both before writing a cited answer."
outcomeBrief: "Every reply names the exact customer figure or policy passage it used, refuses to guess when a document is missing, and saves a clear action plan after each session."
highlights:
  - "Combines live customer conversion numbers with uploaded clinic handbooks in a single question."
  - "Works by text or push-to-talk voice using the exact same verified data pipeline."
  - "Backed by 88 automated checks, including tests that prove the assistant refuses to invent policies."
---

## The problem

Aesthetic clinic owners track rebooking rates, treatment conversions, and lapsed clients in their database, while their consultation scripts and staff policies live in uploaded documents. When a clinic manager asks a practical question like “Why is CoolSculpting down this month, and what does our consultation handbook say we should change?”, a standard AI chatbot cannot help. It has no access to the clinic’s real numbers and will happily invent a policy that sounds plausible.

For V-Unite’s clinic coaching challenge, the goal was to build an assistant that clinic owners could talk to by voice or text between appointments and trust enough to act on.

## What we did

We started from the rule that an operational assistant is only useful if the owner can see where every answer came from. We designed a clean coaching workspace paired with an automation workflow that decides what evidence a question needs before generating a word of advice.

When an owner asks about sales, retention, or lapsed clients, the assistant queries the clinic’s customer records and KPI calculators directly. When the question is about staff procedures or pricing rules, it searches the clinic’s uploaded SOP documents. When a question touches both, it pulls the numbers and the matching handbook section together so the recommendation connects what is happening in the data to what staff are supposed to do at the front desk.

Because clinic managers often check in between appointments, we added push-to-talk voice alongside text chat. Spoken questions go through the exact same verification steps as typed ones, and the assistant speaks back a concise summary while showing the cited records on screen.

## The result

The system runs live at `v-unite-voice-ai-coach.vercel.app` and is protected by 88 automated quality checks. One of those checks specifically tests what happens when an owner asks about a policy the clinic has never uploaded: the assistant states plainly that no matching document exists instead of making up an answer.

Each coaching conversation ends by saving a short session summary and a concrete action plan, turning scattered clinic data and static PDFs into a daily decision tool.
