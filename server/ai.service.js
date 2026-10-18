require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "not-configured",
});

const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

const CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

// The BookLeaf Knowledge Base (from the assignment document)
const KNOWLEDGE_BASE = `
Company Overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium).
- Handles cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing in Delhi. Partners: Repro India and Epitome Books.

Royalty Policy:
- 80/20 split (80% net profit to author, 20% to BookLeaf).
- Net profit = MRP minus printing cost, platform commission, and shipping.
- Calculated quarterly, paid within 45 days of quarter ending.
- Minimum payout threshold: ₹1,000. Below this rolls over to next quarter.
- Payouts via bank transfer to linked account.

ISBN Policy:
- Unique ISBN assigned by BookLeaf under its imprint.
- ISBN errors (duplicate, wrong book linked) are HIGH PRIORITY and must be escalated to production.

Printing & Quality:
- Standard turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects): Free reprint after verification. Author must share photos of defective copies.

Distribution & Availability:
- Channels: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
- New listings: 7–10 business days after publication is complete.
- "Currently Unavailable" usually means stock sync issue. Re-sync takes 24–48 hours.

Production Stages:
Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).

Communication Tone Guidelines:
- Always empathetic and professional. Authors are partners, not customers.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: include actual numbers, dates, and statuses wherever possible.
- If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly.
- If escalation/investigation is needed, give a clear timeline (e.g., "48 hours").
- Always end with a clear next step for the author and/or BookLeaf team.
`;

/**
 * Generates a draft reply using OpenRouter AI.
 * @param {Object} ticket - The ticket details (subject, description, category, priority, author_name, book_title)
 * @returns {Promise<string>} - The generated draft reply or a fallback message.
 */
async function generateDraftReplyResult(ticket) {
  const { subject, description, category, priority, author_name, book_title } = ticket;

  // Fallback if API key is missing
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      draft: getFallbackReply(ticket, "API key not configured."),
      source: "fallback",
    };
  }

  const prompt = `
You are a support representative for BookLeaf Publishing.
Use the following Knowledge Base to answer the author's query.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

TICKET DETAILS:
- Author: ${author_name || "Author"}
- Book: ${book_title || "General/Account Level"}
- Category: ${category || "General Inquiry"}
- Priority: ${priority || "Medium"}
- Subject: ${subject}
- Description: ${description}

STRICT RULES:
1. DO NOT invent specific ISBN numbers, payment amounts, exact dates, or tracking numbers. If you don't know the exact data, say you are checking the records.
2. DO NOT promise that an issue is already fixed unless the ticket confirms it. Instead, say you are escalating it to the team.
3. For ISBN issues, acknowledge the seriousness, state it is a high priority, and say the production team is verifying it.
4. For Royalty issues, explain the quarterly cycle and 45-day window. If specific data is missing, say the team is reviewing their account.
5. For Printing issues, explain the 5-7 day timeline and ask for photos if there is a defect.
6. Always be empathetic, professional, and specific. End with a clear next step.
7. Keep the response under 200 words.

Write a professional, empathetic, and specific draft reply to the author. Start directly with "Dear Author," and do not include any preamble.
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful BookLeaf support agent. Draft replies for author support tickets." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string" || !content.trim()) {
      console.warn("AI returned empty content. Using fallback.");
      return {
        draft: getFallbackReply(ticket, "AI returned an empty response."),
        source: "fallback",
      };
    }

    return { draft: content.trim(), source: "ai" };
  } catch (error) {
    console.error("AI generation error:", error.message);
    return {
      draft: getFallbackReply(ticket, "AI service is currently unavailable."),
      source: "fallback",
    };
  }
}

async function generateDraftReply(ticket) {
  const result = await generateDraftReplyResult(ticket);
  return result.draft;
}

/**
 * Suggests a category and priority for a ticket using the AI.
 * @param {Object} ticket - The ticket details.
 * @returns {Promise<{category: string, priority: string, reason: string}>}
 */
async function suggestClassification(ticket) {
  const { subject, description } = ticket;

  if (!process.env.OPENROUTER_API_KEY) {
    return { category: "General Inquiry", priority: "Medium", reason: "API key not configured." };
  }

  const prompt = `
You are a ticket triage assistant for BookLeaf Publishing.
Classify the following support ticket.

VALID CATEGORIES (choose exactly one):
${CATEGORIES.join(", ")}

VALID PRIORITIES (choose exactly one):
${PRIORITIES.join(", ")}

PRIORITY GUIDELINES:
- Critical: Lost royalties for months, ISBN errors, major financial discrepancies
- High: Printing defects, book unavailable on platforms, delays over 3 weeks
- Medium: General status questions, metadata updates, mild concerns
- Low: Author bio updates, minor information requests

TICKET:
Subject: ${subject}
Description: ${description}

Return ONLY a valid JSON object in this exact format, with no extra text:
{"category": "...", "priority": "...", "reason": "one sentence explanation"}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a ticket classification assistant. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      return { category: "General Inquiry", priority: "Medium", reason: "AI returned empty response." };
    }

    // Extract the JSON object from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { category: "General Inquiry", priority: "Medium", reason: "AI response was not valid JSON." };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate against allowed values
    if (!CATEGORIES.includes(parsed.category)) parsed.category = "General Inquiry";
    if (!PRIORITIES.includes(parsed.priority)) parsed.priority = "Medium";

    return {
      category: parsed.category,
      priority: parsed.priority,
      reason: parsed.reason || "AI suggested classification.",
    };
  } catch (error) {
    console.error("AI classification error:", error.message);
    return { category: "General Inquiry", priority: "Medium", reason: "AI service unavailable." };
  }
}

/**
 * Safe fallback reply if AI fails or is not configured.
 */
function getFallbackReply(ticket, reason) {
  return `Dear Author,\n\nThank you for reaching out to BookLeaf Publishing regarding "${ticket.subject}". We have received your query and are looking into it.\n\nOur team will review your request and get back to you within 48 hours.\n\nBest regards,\nBookLeaf Support Team\n\n(Note: ${reason})`;
}

module.exports = {
  generateDraftReply,
  generateDraftReplyResult,
  suggestClassification,
};