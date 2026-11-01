
require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/trip", async (req, res) => {
    try {
        const { destination, days, budget, style, language } = req.body;

        if (!destination || !days || !budget || !style) {
            return res.status(400).json({
                error: "Please fill in all trip details."
            });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                error: "AI API key is missing. Check your .env file."
            });
        }

        const outputLanguage = language === "ar" ? "Arabic" : "English";

        const prompt = `
You are DARB, a professional AI travel planner.

Create a useful and engaging travel itinerary.

Destination: ${destination}
Duration: ${days} days
Total budget: ${budget} SAR
Travel style: ${style}
Language: ${outputLanguage}

Return ONLY valid JSON. Do not use Markdown code fences.

Follow this exact structure:
{
  "title": "Catchy trip title",
  "subtitle": "Short travel introduction",
  "destination": "${destination}",
  "duration": ${days},
  "budget": ${budget},
  "budget_breakdown": [
    {
      "category": "Accommodation",
      "amount": 1000
    }
  ],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "summary": "Short day description",
      "activities": [
        {
          "time": "Morning",
          "title": "Activity title",
          "description": "Activity details",
          "location": "Place name",
          "estimated_cost": 100
        }
      ],
      "daily_total": 100
    }
  ],
  "tips": [
    "Useful travel tip"
  ]
}

Requirements:
- Write all text in ${outputLanguage}.
- Include exactly ${days} days.
- Include 2 to 4 activities per day.
- Use real, relevant attractions and places.
- Organize activities into morning, afternoon and evening.
- Include accommodation, food, transport, shopping and activities in the budget breakdown.
- All costs must be numeric values in SAR.
- Keep estimated costs within the total budget.
- Make the itinerary practical and engaging.
- Prices are estimates, not live-verified.
- Never invent live opening hours or availability.
- Do not include Markdown or decorative stars.
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
                            content: "You are DARB. Return valid JSON only, following the user's requested structure."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.5,
                    max_completion_tokens: 8000
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Groq API error:", response.status, data);

            return res.status(502).json({
                error: "The AI service could not generate your trip. Please try again."
            });
        }

        const rawPlan = data.choices?.[0]?.message?.content;

        if (!rawPlan) {
            throw new Error("The AI returned an empty response.");
        }

        const cleanPlan = rawPlan
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const plan = JSON.parse(cleanPlan);

        if (!Array.isArray(plan.days) || !plan.title) {
            throw new Error("The AI returned an incomplete itinerary.");
        }

        res.json({ plan });

    } catch (error) {
        console.error("Trip generation error:", error);

        res.status(500).json({
            error: "We couldn't create your trip. Please try again."
        });
    }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`DARB is running at http://127.0.0.1:${PORT}`);
});

server.on("error", (error) => {
    console.error("DARB server error:", error);
});
