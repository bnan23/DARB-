
const form = document.getElementById("trip-form");
const destinationInput = document.getElementById("destination");
const daysInput = document.getElementById("days");
const budgetInput = document.getElementById("budget");
const styleInput = document.getElementById("style");
const generateBtn = document.getElementById("generate-btn");
const result = document.getElementById("result");
const emptyState = document.getElementById("empty-state");
const languageBtn = document.getElementById("language-btn");

let currentLanguage = "en";
let currentPlan = null;
let activeDay = 0;

const translations = {
    en: {
        language: "العربية",
        tag: "✦ AI POWERED TRAVEL PLANNER",
        title: 'Your next adventure,<br><span>designed by AI.</span>',
        description: "Tell us where you want to go. We'll create a personalized travel itinerary that fits your style and budget.",
        formTitle: "Plan your trip",
        formSubtitle: "Let's create something unforgettable.",
        destination: "Where do you want to go?",
        destinationPlaceholder: "e.g. Paris, Japan, Dubai",
        days: "Trip duration (days)",
        budget: "Your budget (SAR)",
        budgetPlaceholder: "e.g. 5000",
        style: "What's your travel style?",
        styles: ["Relaxation", "Adventure", "Shopping", "Culture & History", "Food & Experiences"],
        generate: "Generate my trip ✦",
        loading: "Creating your trip...",
        footer: 'Made for curious travelers <span>✦</span>',
        emptyTitle: "Your journey starts here",
        emptyDescription: "Fill in your travel details and let DARB create your personalized travel guide.",
        budgetTitle: "Budget breakdown",
        itinerary: "Your itinerary",
        tips: "Travel tips",
        daysLabel: "Days",
        budgetLabel: "Total budget",
        dailyTotal: "Daily estimated total",
        estimate: "Prices are estimates only and are not live-verified.",
        error: "We couldn't create your trip. Please try again.",
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening",
        day: "DAY",
        sar: "SAR"
    },

    ar: {
        language: "English",
        tag: "✦ مخطط رحلات مدعوم بالذكاء الاصطناعي",
        title: 'رحلتك القادمة،<br><span>يخطط لها الذكاء الاصطناعي.</span>',
        description: "اختر وجهتك وحدد ميزانيتك ومدة رحلتك، ودع دَرْب يصمم لك برنامج سفر يناسب اهتماماتك.",
        formTitle: "خطط رحلتك",
        formSubtitle: "خلّنا نصمم لك رحلة ما تنسى.",
        destination: "وين حاب تسافر؟",
        destinationPlaceholder: "مثلاً: باريس، اليابان، دبي",
        days: "مدة الرحلة (بالأيام)",
        budget: "ميزانيتك (ريال سعودي)",
        budgetPlaceholder: "مثلاً: 5000",
        style: "وش نوع الرحلة اللي تفضلها؟",
        styles: ["استرخاء", "مغامرات", "تسوق", "ثقافة وتاريخ", "مطاعم وتجارب"],
        generate: "خطط لي رحلتي ✦",
        loading: "جاري تصميم رحلتك...",
        footer: 'صُمم لمحبي اكتشاف العالم <span>✦</span>',
        emptyTitle: "رحلتك تبدأ من هنا",
        emptyDescription: "أدخل تفاصيل رحلتك ودع دَرْب يصمم لك دليل سفر يناسبك.",
        budgetTitle: "توزيع الميزانية",
        itinerary: "برنامج رحلتك",
        tips: "نصائح للمسافر",
        daysLabel: "أيام",
        budgetLabel: "الميزانية الإجمالية",
        dailyTotal: "إجمالي تكلفة اليوم التقديرية",
        estimate: "الأسعار تقديرية وليست مؤكدة بشكل مباشر.",
        error: "ما قدرنا ننشئ رحلتك. حاول مرة ثانية.",
        morning: "الصباح",
        afternoon: "الظهر",
        evening: "المساء",
        day: "اليوم",
        sar: "ريال"
    }
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function money(value) {
    return Number(value || 0).toLocaleString(
        currentLanguage === "ar" ? "ar-SA" : "en-US"
    );
}

function changeLanguage() {
    currentLanguage = currentLanguage === "en" ? "ar" : "en";

    const t = translations[currentLanguage];
    const isArabic = currentLanguage === "ar";

    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.body.dir = isArabic ? "rtl" : "ltr";

    languageBtn.textContent = t.language;

    document.getElementById("tag").textContent = t.tag;
    document.getElementById("main-title").innerHTML = t.title;
    document.getElementById("description").textContent = t.description;
    document.getElementById("form-title").textContent = t.formTitle;
    document.getElementById("form-subtitle").textContent = t.formSubtitle;
    document.getElementById("destination-label").textContent = t.destination;
    document.getElementById("days-label").textContent = t.days;
    document.getElementById("budget-label").textContent = t.budget;
    document.getElementById("style-label").textContent = t.style;
    document.getElementById("destination").placeholder = t.destinationPlaceholder;
    document.getElementById("budget").placeholder = t.budgetPlaceholder;

    document.getElementById("style-relax").textContent = t.styles[0];
    document.getElementById("style-adventure").textContent = t.styles[1];
    document.getElementById("style-shopping").textContent = t.styles[2];
    document.getElementById("style-culture").textContent = t.styles[3];
    document.getElementById("style-food").textContent = t.styles[4];

    document.getElementById("footer").innerHTML = t.footer;
    document.getElementById("empty-title").textContent = t.emptyTitle;
    document.getElementById("empty-description").textContent = t.emptyDescription;

    if (!generateBtn.disabled) {
        generateBtn.textContent = t.generate;
    }

    if (currentPlan) {
        renderTrip(currentPlan);
    }
}

function renderTrip(plan) {
    const t = translations[currentLanguage];
    const isArabic = currentLanguage === "ar";

    const budgetItems = (plan.budget_breakdown || []).map(item => `
        <div class="budget-item">
            <span>${escapeHTML(item.category)}</span>
            <strong>${money(item.amount)} ${t.sar}</strong>
        </div>
    `).join("");

    const tabs = (plan.days || []).map((day, index) => `
        <button
            type="button"
            class="day-tab ${index === activeDay ? "active" : ""}"
            data-day="${index}">
            ${t.day} ${money(day.day || index + 1)}
        </button>
    `).join("");

    const day = plan.days[activeDay];

    const activities = (day.activities || []).map(activity => {
        let time = activity.time || "";

        if (time.toLowerCase().includes("morning")) time = t.morning;
        else if (time.toLowerCase().includes("afternoon")) time = t.afternoon;
        else if (time.toLowerCase().includes("evening")) time = t.evening;

        return `
            <article class="activity-card">
                <div class="activity-time">${escapeHTML(time)}</div>

                <div class="activity-details">
                    <h4>${escapeHTML(activity.title)}</h4>
                    <p>${escapeHTML(activity.description)}</p>
                    ${activity.location ? `
                        <div class="activity-location">
                            ⌖ ${escapeHTML(activity.location)}
                        </div>
                    ` : ""}
                </div>

                <div class="activity-cost">
                    ${money(activity.estimated_cost)} ${t.sar}
                </div>
            </article>
        `;
    }).join("");

    const tips = (plan.tips || []).map(tip => `
        <li>${escapeHTML(tip)}</li>
    `).join("");

    result.innerHTML = `
        <div class="trip-results">

            <header class="trip-hero">
                <span class="trip-eyebrow">DARB · YOUR TRAVEL GUIDE</span>
                <h2>${escapeHTML(plan.title)}</h2>
                <p>${escapeHTML(plan.subtitle)}</p>

                <div class="trip-stats">
                    <div class="stat-card">
                        <strong>${money(plan.duration)}</strong>
                        <span>${t.daysLabel}</span>
                    </div>

                    <div class="stat-card">
                        <strong>${money(plan.budget)}</strong>
                        <span>${t.budgetLabel} · ${t.sar}</span>
                    </div>
                </div>
            </header>

            <section class="content-card">
                <h3 class="section-title">${t.budgetTitle}</h3>
                <div class="budget-list">${budgetItems}</div>
            </section>

            <section class="content-card">
                <h3 class="section-title">${t.itinerary}</h3>

                <div class="day-tabs">${tabs}</div>

                <div class="day-content">
                    <h3>${escapeHTML(day.title)}</h3>
                    <p class="day-summary">${escapeHTML(day.summary)}</p>

                    ${activities}

                    <div class="daily-total">
                        <span>${t.dailyTotal}</span>
                        <strong>${money(day.daily_total)} ${t.sar}</strong>
                    </div>
                </div>
            </section>

            <section class="content-card">
                <h3 class="section-title">${t.tips}</h3>
                <ul class="tips-list">${tips}</ul>
            </section>

            <p class="estimate-note">${t.estimate}</p>
        </div>
    `;

    result.style.display = "block";
    result.classList.add("has-results");
    emptyState.style.display = "none";
}

result.addEventListener("click", event => {
    const tab = event.target.closest("[data-day]");

    if (!tab || !currentPlan) return;

    activeDay = Number(tab.dataset.day);
    renderTrip(currentPlan);
});

languageBtn.addEventListener("click", changeLanguage);

form.addEventListener("submit", async event => {
    event.preventDefault();

    const destination = destinationInput.value.trim();
    const days = Number(daysInput.value);
    const budget = Number(budgetInput.value);
    const style = styleInput.value;

    if (!destination || !Number.isInteger(days) || days < 1 ||
        days > 14 || !Number.isFinite(budget) || budget <= 0) {
        return;
    }

    const t = translations[currentLanguage];

    generateBtn.disabled = true;
    generateBtn.textContent = t.loading;

    emptyState.style.display = "none";
    result.style.display = "block";
    result.classList.remove("has-results");
    result.innerHTML = `<div class="empty-state"><p>${t.loading}</p></div>`;

    try {
        const response = await fetch("/api/trip", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                destination,
                days,
                budget,
                style,
                language: currentLanguage
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || t.error);
        }

        if (!data.plan || !Array.isArray(data.plan.days) || data.plan.days.length === 0) {
            throw new Error(t.error);
        }

        currentPlan = data.plan;
        activeDay = 0;
        renderTrip(currentPlan);

    } catch (error) {
        console.error("Trip generation failed:", error);

        result.classList.remove("has-results");
        result.innerHTML = `
            <div class="error-message">${escapeHTML(error.message || t.error)}</div>
        `;

    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = translations[currentLanguage].generate;
    }
});
