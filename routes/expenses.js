const express = require('express');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/expenses
// @desc    Get all expenses for current user (with filters)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type, category, startDate, endDate, sort = '-date', page = 1, limit = 50 } = req.query;
    
    const query = { user: req.user._id };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query)
    ]);

    res.json({
      success: true,
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses.' });
  }
});

// @route   GET /api/expenses/stats
// @desc    Get expense statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;
    
    // Use ROLLING windows so data is always visible
    switch (period) {
      case 'week':
        startDate = new Date(now - 7   * 24 * 60 * 60 * 1000); // last 7 days
        break;
      case 'month':
        startDate = new Date(now - 30  * 24 * 60 * 60 * 1000); // last 30 days
        break;
      case 'year':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000); // last 365 days
        break;
      default:
        startDate = new Date(now - 30  * 24 * 60 * 60 * 1000);
    }

    const [summary, categoryBreakdown, recentTransactions, dailyTrend] = await Promise.all([
      // Total income and expenses
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: startDate } } },
        { $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }}
      ]),
      
      // Category breakdown for expenses
      Expense.aggregate([
        { $match: { user: req.user._id, type: 'expense', date: { $gte: startDate } } },
        { $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }},
        { $sort: { total: -1 } }
      ]),
      
      // Recent 5 transactions
      Expense.find({ user: req.user._id })
        .sort('-date')
        .limit(5),
      
      // Daily trend for last 7 days
      Expense.aggregate([
        { 
          $match: { 
            user: req.user._id, 
            date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) } 
          } 
        },
        { $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }},
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    const income = summary.find(s => s._id === 'income')?.total || 0;
    const expense = summary.find(s => s._id === 'expense')?.total || 0;

    res.json({
      success: true,
      stats: {
        income,
        expense,
        balance: income - expense,
        transactionCount: summary.reduce((acc, s) => acc + s.count, 0),
        categoryBreakdown,
        recentTransactions,
        dailyTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense/income
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category, description, date } = req.body;
    
    const expense = await Expense.create({
      user: req.user._id,
      title,
      amount,
      type,
      category,
      description,
      date: date || Date.now()
    });

    res.status(201).json({
      success: true,
      message: `${type === 'income' ? 'Income' : 'Expense'} added successfully!`,
      expense
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to add transaction.' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const { title, amount, type, category, description, date } = req.body;
    
    Object.assign(expense, {
      ...(title && { title }),
      ...(amount && { amount }),
      ...(type && { type }),
      ...(category && { category }),
      ...(description !== undefined && { description }),
      ...(date && { date })
    });

    await expense.save();
    res.json({ success: true, message: 'Transaction updated!', expense });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Update failed.' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.json({ success: true, message: 'Transaction deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed.' });
  }
});

// @route   GET /api/expenses/alerts
// @desc    Generate smart financial alerts by analyzing spending patterns
// @access  Private
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const last30  = new Date(now - 30 * day);
    const prev30  = new Date(now - 60 * day);
    const last7   = new Date(now - 7  * day);

    // Fetch this period and previous period data in parallel
    const [thisPeriod, prevPeriod, recentTxns] = await Promise.all([
      Expense.find({ user: req.user._id, date: { $gte: last30 } }),
      Expense.find({ user: req.user._id, date: { $gte: prev30, $lt: last30 } }),
      Expense.find({ user: req.user._id, date: { $gte: last7 } }).sort('-amount')
    ]);

    const alerts = [];

    // ── Helper sums ──
    const sum = (arr, type) => arr.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
    const byCat = (arr) => arr.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
    }, {});

    const thisIncome  = sum(thisPeriod, 'income');
    const thisExpense = sum(thisPeriod, 'expense');
    const prevExpense = sum(prevPeriod, 'expense');
    const prevIncome  = sum(prevPeriod, 'income');
    const savingsRate = thisIncome > 0 ? ((thisIncome - thisExpense) / thisIncome) * 100 : 0;

    // ── 1. SAVINGS RATE alerts ──
    if (thisIncome > 0) {
      if (savingsRate < 0) {
        alerts.push({ id: 'neg-savings', severity: 'danger', icon: '🔴', title: 'Spending Exceeds Income!', message: `You've spent ₹${Math.abs(thisIncome - thisExpense).toLocaleString('en-IN')} more than you earned in the last 30 days. Review your expenses immediately.`, category: 'Savings' });
      } else if (savingsRate < 20) {
        alerts.push({ id: 'low-savings', severity: 'warning', icon: '🟡', title: 'Low Savings Rate', message: `Your savings rate is ${savingsRate.toFixed(1)}% — financial experts recommend saving at least 20% of income. Try cutting discretionary spending.`, category: 'Savings' });
      } else if (savingsRate >= 40) {
        alerts.push({ id: 'good-savings', severity: 'success', icon: '🟢', title: 'Excellent Savings Rate!', message: `You're saving ${savingsRate.toFixed(1)}% of your income. Great discipline! Consider investing the surplus.`, category: 'Savings' });
      }
    }

    // ── 2. OVERALL EXPENSE SPIKE vs last period ──
    if (prevExpense > 0) {
      const changePercent = ((thisExpense - prevExpense) / prevExpense) * 100;
      if (changePercent > 40) {
        alerts.push({ id: 'expense-spike', severity: 'danger', icon: '📈', title: 'Spending Spike Detected', message: `Your expenses are up ${changePercent.toFixed(0)}% vs the previous 30 days (₹${thisExpense.toLocaleString('en-IN')} vs ₹${prevExpense.toLocaleString('en-IN')}). Identify what's driving this increase.`, category: 'Spending' });
      } else if (changePercent > 20) {
        alerts.push({ id: 'expense-up', severity: 'warning', icon: '⚠️', title: 'Higher Spending This Month', message: `Spending is up ${changePercent.toFixed(0)}% compared to last 30 days. Keep an eye on your budget.`, category: 'Spending' });
      } else if (changePercent < -20) {
        alerts.push({ id: 'expense-down', severity: 'success', icon: '✅', title: 'Spending Down This Period', message: `Your spending dropped ${Math.abs(changePercent).toFixed(0)}% compared to last period. Well done!`, category: 'Spending' });
      }
    }

    // ── 3. CATEGORY SPIKES ──
    const thisCats = byCat(thisPeriod);
    const prevCats = byCat(prevPeriod);
    const catLabels = { food: 'Food & Dining', transport: 'Transport', entertainment: 'Entertainment', shopping: 'Shopping', bills: 'Bills & Utilities', health: 'Health', education: 'Education', other: 'Other' };

    for (const [cat, amount] of Object.entries(thisCats)) {
      const prev = prevCats[cat] || 0;
      if (prev > 0 && amount > prev * 1.5) {
        alerts.push({ id: `cat-${cat}`, severity: 'warning', icon: '📊', title: `High ${catLabels[cat] || cat} Spending`, message: `${catLabels[cat] || cat} spending is up ${(((amount - prev) / prev) * 100).toFixed(0)}% vs last period (₹${amount.toLocaleString('en-IN')} vs ₹${prev.toLocaleString('en-IN')}).`, category: 'Category' });
      }
    }

    // ── 4. LARGE SINGLE TRANSACTIONS (last 7 days) ──
    const avgExpense = thisExpense / Math.max(thisPeriod.filter(t => t.type === 'expense').length, 1);
    recentTxns.filter(t => t.type === 'expense').slice(0, 3).forEach(t => {
      if (t.amount > avgExpense * 3 && t.amount > 2000) {
        alerts.push({ id: `large-${t._id}`, severity: 'info', icon: '💸', title: `Large Transaction: ${t.title}`, message: `₹${t.amount.toLocaleString('en-IN')} on ${t.title} is significantly above your average expense of ₹${Math.round(avgExpense).toLocaleString('en-IN')}.`, category: 'Transaction' });
      }
    });

    // ── 5. NO INCOME WARNING ──
    if (thisIncome === 0 && prevIncome > 0) {
      alerts.push({ id: 'no-income', severity: 'danger', icon: '⚡', title: 'No Income Recorded This Period', message: 'You haven\'t logged any income in the last 30 days. Make sure to record all income sources for accurate tracking.', category: 'Income' });
    }

    // ── 6. FOOD OVERSPEND RULE OF THUMB ──
    if (thisIncome > 0 && thisCats.food > thisIncome * 0.30) {
      alerts.push({ id: 'food-high', severity: 'warning', icon: '🍔', title: 'Food Spending is High', message: `Food & dining is ${((thisCats.food / thisIncome) * 100).toFixed(0)}% of your income this period. The recommended limit is ~20-25%.`, category: 'Category' });
    }

    // ── 7. ENTERTAINMENT CAP ──
    if (thisIncome > 0 && (thisCats.entertainment || 0) > thisIncome * 0.15) {
      alerts.push({ id: 'ent-high', severity: 'info', icon: '🎬', title: 'Entertainment Budget Exceeded', message: `Entertainment spending is ${(((thisCats.entertainment || 0) / thisIncome) * 100).toFixed(0)}% of income. Consider capping it at 10-15%.`, category: 'Category' });
    }

    // Sort: danger → warning → info → success
    const order = { danger: 0, warning: 1, info: 2, success: 3 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);

    res.json({ success: true, alerts, meta: { thisIncome, thisExpense, savingsRate: savingsRate.toFixed(1), period: 'last 30 days' } });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate alerts.' });
  }
});

module.exports = router;
