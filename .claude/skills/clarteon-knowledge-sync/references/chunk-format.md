# Content and chunk format

## Content file front matter

```
---
title: Business automation
slug: solutions/business-automation
type: page          # page | case-study | insight | faq
status: published   # draft | published
summary: One or two plain sentences.
tags: [automation, admin work]
synonyms: [workflow, repetitive tasks, manual processes]
---
```

## Chunk record

```
{
  "id": "solutions/business-automation#what-we-automate",
  "url": "/solutions#business-automation",
  "title": "Business automation",
  "headingPath": ["Solutions", "Business automation", "What we automate"],
  "text": "...",
  "tags": ["automation", "admin work"],
  "synonyms": ["workflow", "repetitive tasks", "manual processes"]
}
```

## Search result returned to the model

```
{ "title": "...", "url": "...", "snippet": "first useful 300 characters or fewer" }
```

Return at most 3 results. Rank with the title, tags and synonyms weighted above body text.
