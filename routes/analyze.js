const express = require('express');
const router = express.Router();
const fetch = global.fetch;
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

function buildFallbackAdvice(summary) {
  if (!summary) {
    return "No expenses logged for this month yet, so there's nothing to analyze. Add a few entries and check back.";
  }

  const { totalSpent, totalBudget, categoryBreakdown, overBudgetCategories } = summary;
  const topCategory = categoryBreakdown?.[0];

  if (totalBudget && totalSpent > totalBudget) {
    const overage = totalSpent - totalBudget;
    if (topCategory) {
      return `You spent ₹${Math.round(totalSpent).toLocaleString('en-IN')} against a budget of ₹${Math.round(totalBudget).toLocaleString('en-IN')}, which is ₹${Math.round(overage).toLocaleString('en-IN')} over. ${topCategory.category} was your biggest pressure point, so try trimming that category first next month.`;
    }
    return `You spent ₹${Math.round(totalSpent).toLocaleString('en-IN')} against a budget of ₹${Math.round(totalBudget).toLocaleString('en-IN')}, which is ₹${Math.round(totalSpent - totalBudget).toLocaleString('en-IN')} over. Focus on the categories that exceeded their limits and cut back there first.`;
  }

  if (overBudgetCategories?.length) {
    return `You stayed close to plan overall, but ${overBudgetCategories.join(', ')} went over budget. Keep a tighter watch on those categories next month to avoid a repeat.`;
  }

  return `You are staying within your budget well this month. Keep the momentum going by automating one small transfer to savings before the next payday.`;
}

router.post('/', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'month (YYYY-MM) is required' });

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const expenses = await Expense.find({ date: { $gte: start, $lt: end } });
    const budgets = await Budget.find({ month });

    if (expenses.length === 0) {
      return res.json({
        summary: null,
        advice: "No expenses logged for this month yet, so there's nothing to analyze. Add a few entries and check back."
      });
    }

    const totals = {};
    let totalSpent = 0;
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
      totalSpent += e.amount;
    }

    const budgetMap = {};
    let totalBudget = 0;
    for (const b of budgets) {
      budgetMap[b.category] = b.amount;
      totalBudget += b.amount;
    }

    const categoryBreakdown = Object.keys(totals).map(category => {
      const spent = totals[category];
      const budget = budgetMap[category] || null;
      const pctOfBudget = budget ? Math.round((spent / budget) * 100) : null;
      return { category, spent, budget, pctOfBudget };
    }).sort((a, b) => b.spent - a.spent);

    const overBudget = categoryBreakdown.filter(c => c.budget && c.spent > c.budget);

    const summary = {
      month,
      totalSpent,
      totalBudget: totalBudget || null,
      categoryBreakdown,
      overBudgetCategories: overBudget.map(c => c.category)
    };

    const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
    let advice = buildFallbackAdvice(summary);

    if (apiKey) {
      try {
        const prompt = `You are a practical personal finance assistant for a college student or early-career professional in India (amounts in INR).
Given this monthly spending summary as JSON, write a short, specific, encouraging analysis:
1. One sentence on overall budget health.
2. The single biggest area of overspending, if any, with a concrete suggestion.
3. One realistic, specific action they could take next month.
Keep it under 120 words, plain language, no generic advice like "make a budget" since they already have one.

Data: ${JSON.stringify(summary)}`;

        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 300
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          advice = aiData.choices?.[0]?.message?.content?.trim() || advice;
        } else {
          const errText = await aiResponse.text();
          console.error('Groq API error:', errText);
        }
      } catch (err) {
        console.error('Groq API request failed:', err.message);
      }
    }

    res.json({ summary, advice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;