
require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/trip", async (req, res) => {
    try {
        const { destination, days, budget, style, language } = req.body;

        const tripDays = Number(days);
        const tripBudget = Number(budget);

        if (
            !destination ||
            !Number.isInteger(tripDays) ||
            tripDays < 1 ||
            !Number.isFinite(tripBudget) ||
            tripBudget <= 0 ||
            !style
        ) {
            return res.status(400).json({
                error: "Please enter valid trip details."
            });
        }

        if (!process.env.GROQ_API_KEY) {
            console.error("GROQ_API_KEY is missing.");

            return res.status(500).json({
                error: "The AI service is not configured."
            });
        }

        const outputLanguage = language === "ar" ? "Arabic" : "English";

        const prompt = `
You are DARB, an AI travel planner.

Create a practical travel itinerary using the following details:
Destination: ${destination}
Duration: ${tripDays} days
Total budget: ${tripBudget} SAR
Travel style: ${style}
Language: ${outputLanguage}

Return one valid JSON object only. Do not use Markdown fences or text outside JSON.

Use exactly this structure:
{
  "title": "Trip title",
  "subtitle": "Short introduction",
  "destination": "${destination}",
  "duration": ${tripDays},
  "budget": ${tripBudget},
  "budget_breakdown": [
    {"category": "Accommodation", "amount": 0},
    {"category": "Food", "amount": 0},
    {"category": "Transport", "amount": 0},
    {"category": "Activities", "amount": 0},
    {"category": "Shopping", "amount": 0}
  ],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "summary": "Short summary",
      "activities": [
        {
          "time": "Morning",
          "title": "Activity title",
          "description": "Brief details",
          "location": "Place name",
          "estimated_cost": 0
        }
      ],
      "daily_total": 0
    }
  ],
  "tips": ["Useful travel tip"]
}

Requirements:
- Write all user-facing text in ${outputLanguage}.
- Include exactly ${tripDays} day objects.
- Include 2 activities per day to keep the response concise.
- Use relevant real attractions; do not invent opening hours or live availability.
- Use morning, afternoon, or evening for activity times.
- All costs must be numeric SAR estimates.
- Keep costs realistic for the destination and within the total budget.
- The budget breakdown should cover accommodation, food, transport, activities, and shopping.
- Keep descriptions concise.
- Prices are estimates, not live-verified.
- Ensure the JSON is complete and valid, with all strings and property names correctly quoted.
`;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-120b",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are DARB. Return only a complete, valid JSON object. Never add Markdown or explanations."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_completion_tokens: 4000
                }),
                signal: AbortSignal.timeout(90000)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Groq API error:", response.status, data);

            if (response.status === 429) {
                return res.status(429).json({
                    error: "The AI service is busy. Please wait a few seconds and try again."
                });
            }

            return res.status(502).json({
                error: "The AI service could not generate your trip. Please try again."
            });
        }

        const choice = data.choices?.[0];
        const rawPlan = choice?.message?.content;

        if (!rawPlan || typeof rawPlan !== "string") {
            console.error("Groq returned no message content.");

            return res.status(502).json({
                error: "The AI returned an empty response. Please try again."
            });
        }

        if (choice.finish_reason === "length") {
            console.error("Groq response reached the token limit.");

            return res.status(502).json({
                error: "The itinerary was too long to complete. Please try fewer days."
            });
        }

        const cleanPlan = rawPlan
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let plan;

        try {
            plan = JSON.parse(cleanPlan);
        } catch (parseError) {
            console.error("Invalid JSON from Groq:", parseError.message);

            return res.status(502).json({
                error: "The AI returned an incomplete itinerary. Please try again."
            });
        }

        if (
            !plan ||
            typeof plan.title !== "string" ||
            !Array.isArray(plan.days) ||
            plan.days.length !== tripDays
        ) {
            console.error("Groq returned an invalid itinerary structure.");

            return res.status(502).json({
                error: "The itinerary was incomplete. Please try again."
            });
        }

        return res.json({ plan });

    } catch (error) {
        console.error("Trip generation error:", error);

        if (error.name === "TimeoutError") {
            return res.status(504).json({
                error: "The AI service took too long to respond. Please try again."
            });
        }

        return res.status(500).json({
            error: "We couldn't create your trip. Please try again."
        });
    }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`DARB is running on port ${PORT}`);
});

server.on("error", (error) => {
    console.error("DARB server error:", error);
});
