---
title: "Stopping double-sold stock and manual payment checks for a custom bouquet shop."
slug: janelles-satin-bouquet
type: case-study
status: published
publishedAt: "2026-11-05"
order: 1
category: "operations"
categoryLabel: "Orders, stock & payments"
client: "Janelle’s Satin Bouquet (Dasmariñas, Cavite)"
solution_type: "Online storefront, payment automation, and AI shop assistant"
permission: "Approved by shop owner and lead developer Aldrei Santua on 2026-11-05"
image: "/images/work/janelles-satin-bouquet.webp"
imageAlt: "Janelle’s Satin Bouquet online storefront showing handcrafted satin bouquets and custom order options."
liveUrl: "https://shop.janelle-bouquet.workers.dev/"
summary: "A handcrafted bouquet shop in Cavite was taking orders and checking GCash payments by hand over Messenger. We built a mobile storefront that locks stock at checkout, verifies payment texts automatically, and answers buyer questions from live inventory."
seoTitle: "Order and Payment Automation for a Bouquet Shop"
seoDescription: "How we replaced manual Messenger order tracking and GCash receipt checks with an online shop, automated payment verification, and a live AI assistant."
tags:
  - order automation
  - payment verification
  - e-commerce
  - AI assistant
  - inventory management
  - small business automation
synonyms:
  - Messenger orders
  - GCash verification
  - online store
  - bouquet shop
  - stock tracking
problemBrief: "Taking orders in chat meant answering the same price questions all day, checking GCash screenshots by eye, and risking selling a one-of-a-kind bouquet twice."
approachBrief: "We built a phone-friendly storefront that holds stock at checkout, matches incoming GCash confirmation texts automatically, and alerts the owner on Telegram only when a payment needs a human look."
outcomeBrief: "Buyers price and book orders on their own, exact payments confirm automatically, and the built-in assistant answers questions in English, Tagalog, or Taglish using live shop prices."
highlights:
  - "Stock locks at checkout so one-of-a-kind bouquets cannot be promised to two buyers at once."
  - "GCash payment texts match against unique expected amounts and single-use reference numbers."
  - "Ambiguous payments never mark an order paid on their own; they send a Telegram alert for one-tap review."
---

## The problem

Janelle’s Satin Bouquet makes handcrafted satin arrangements in Dasmariñas, Cavite. Because every order ran through Facebook and Messenger, the owner spent hours each day replying to the same questions about prices, ribbon colors, and delivery dates before an order was even placed.

Once a customer decided to buy, the manual work grew harder. Each arrangement was handmade in small batches, so two buyers messaging at the same time could claim the same bouquet before the owner updated the page. Payment checks were also done by hand: buyers sent GCash screenshots in chat, and the owner had to check reference numbers and amounts on her phone between making bouquets.

## What we did

During diagnosis, we traced where the owner lost the most time: quoting custom bouquets, holding stock during checkout, and verifying GCash payments. Instead of handing her a complicated back-office tool meant for a warehouse team, we built a storefront and admin designed to run entirely from a phone.

Customers can now browse ready-made designs, price a build-your-own bouquet step by step, or submit a custom request. When a buyer checks out, the shop holds that item immediately and generates a unique expected payment amount for GCash QR checkout.

To remove manual receipt checking, we connected an automated payment matcher. When a payment text arrives, the system checks the reference number and exact amount against open orders. Clear matches confirm the order automatically. If a reference number looks reused or the amount does not line up, the system holds the order in a review queue and sends a Telegram message to the owner so she can approve or reject it with one tap.

Finally, we added a shop assistant connected directly to the live product catalog. Unlike generic chatbots that guess at prices, this assistant reads current stock and pricing before replying in English, Tagalog, or Taglish.

## The result

The shop now runs live at `shop.janelle-bouquet.workers.dev` with a catalog, custom bouquet builder, order tracking, and a mobile admin panel. Buyers get instant answers on pricing and availability at any hour without waiting for a manual chat reply.

Most importantly, the payment workflow protects the business by default. Verified payments move straight into production, uncertain claims pause safely for human review, and the owner can manage stock and orders from her phone in minutes instead of spending her evenings sorting through chat threads.
