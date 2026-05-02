require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Expense = require('./models/Expense');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

const DEMO_EMAIL    = 'demo@expenseflow.com';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME     = 'Yash Rathore';

function date(daysAgo, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const transactions = [
  // ══════════════════════════════════════
  // ██ INCOME — THIS MONTH (last 30 days)
  // ══════════════════════════════════════
  { title: 'April Salary',            amount: 85000, type: 'income',  category: 'salary',        date: date(28), description: 'Monthly salary credited by TechCorp Pvt Ltd' },
  { title: 'Freelance — React App',   amount: 22000, type: 'income',  category: 'freelance',     date: date(20), description: 'Built a custom dashboard for a startup client' },
  { title: 'Stock Dividends — HDFC',  amount:  3800, type: 'income',  category: 'investment',    date: date(16), description: 'Quarterly dividend from HDFC Bank stocks' },
  { title: 'Mutual Fund Returns',     amount:  6200, type: 'income',  category: 'investment',    date: date(10), description: 'SIP redemption — Mirae Asset Large Cap' },
  { title: 'Birthday Cash Gift',      amount:  5000, type: 'income',  category: 'gift',          date: date(7),  description: 'Gift from relatives on birthday' },
  { title: 'Referral Bonus',          amount:  2500, type: 'income',  category: 'freelance',     date: date(3),  description: 'Referral reward from Zerodha' },

  // ══════════════════════════════════════
  // ██ EXPENSES — THIS MONTH
  // ══════════════════════════════════════
  { title: 'Big Basket Groceries',    amount:  4200, type: 'expense', category: 'food',          date: date(27), description: 'Monthly grocery haul — fruits, veggies, dairy' },
  { title: 'Airtel Postpaid Bill',    amount:   799, type: 'expense', category: 'bills',         date: date(26), description: 'Monthly mobile plan with 100GB data' },
  { title: 'Jio Fiber Internet',      amount:   999, type: 'expense', category: 'bills',         date: date(25), description: '1 Gbps home broadband — April bill' },
  { title: 'BESCOM Electricity',      amount:  2100, type: 'expense', category: 'bills',         date: date(24), description: 'Bangalore electricity board — April' },
  { title: 'Zomato — Office Lunch',   amount:   580, type: 'expense', category: 'food',          date: date(23), description: 'Ordered for team working from home' },
  { title: 'Petrol — Honda City',     amount:  3200, type: 'expense', category: 'transport',     date: date(22), description: 'Full tank + weekly top-ups' },
  { title: 'Netflix Premium',         amount:   649, type: 'expense', category: 'entertainment', date: date(21), description: '4K UHD monthly subscription' },
  { title: 'Gym — Cult.fit',          amount:  2499, type: 'expense', category: 'health',        date: date(20), description: 'Monthly premium membership with classes' },
  { title: 'Udemy Courses x3',        amount:  1299, type: 'expense', category: 'education',     date: date(19), description: 'System Design, DSA, AWS courses on sale' },
  { title: 'Amazon — Headphones',     amount:  7499, type: 'expense', category: 'shopping',      date: date(18), description: 'Sony WH-1000XM5 noise cancelling' },
  { title: 'Swiggy — Weekend Orders', amount:  1850, type: 'expense', category: 'food',          date: date(17), description: 'Biryani, pizza, and momos across the weekend' },
  { title: 'Ola Metro + Cab',         amount:   680, type: 'expense', category: 'transport',     date: date(16), description: 'Office commute + evening rides' },
  { title: 'Bangalore Water Board',   amount:   350, type: 'expense', category: 'bills',         date: date(15), description: 'Quarterly water utility bill' },
  { title: 'PVR Cinemas x2',          amount:   950, type: 'expense', category: 'entertainment', date: date(14), description: 'IMAX tickets — Avengers re-release' },
  { title: 'Max Healthcare Visit',    amount:  1200, type: 'expense', category: 'health',        date: date(13), description: 'Annual health checkup + blood tests' },
  { title: 'O\'Reilly Books Online',  amount:   799, type: 'expense', category: 'education',     date: date(12), description: 'Monthly subscription for tech ebooks' },
  { title: 'H&M — Formal Shirts',    amount:  3200, type: 'expense', category: 'shopping',      date: date(11), description: '4 formal shirts for office — summer sale' },
  { title: 'Flipkart — Sneakers',    amount:  4500, type: 'expense', category: 'shopping',      date: date(9),  description: 'Puma RS-X running shoes' },
  { title: 'Spotify Premium',         amount:   119, type: 'expense', category: 'entertainment', date: date(8),  description: 'Music subscription — Individual plan' },
  { title: 'Swiggy Instamart',        amount:   420, type: 'expense', category: 'food',          date: date(7),  description: 'Quick grocery top-up — milk, eggs, bread' },
  { title: 'PharmEasy — Vitamins',    amount:   880, type: 'expense', category: 'health',        date: date(6),  description: 'Vitamin D3, Omega-3, Multivitamins' },
  { title: 'Uber to Airport',         amount:  1100, type: 'expense', category: 'transport',     date: date(5),  description: 'Cab to Kempegowda Airport' },
  { title: 'Coffee — Third Wave',     amount:   680, type: 'expense', category: 'food',          date: date(4),  description: 'Work-from-cafe sessions x4 this week' },
  { title: 'Gas Cylinder — BPCL',    amount:   903, type: 'expense', category: 'bills',         date: date(3),  description: 'LPG refill booking' },
  { title: 'Prime Video Annual',      amount:  1499, type: 'expense', category: 'entertainment', date: date(2),  description: 'Amazon Prime yearly renewal' },
  { title: 'Restaurant — Toit Pub',   amount:  2400, type: 'expense', category: 'food',          date: date(1),  description: 'Team outing dinner + drinks' },
  { title: 'Metro Monthly Pass',      amount:   790, type: 'expense', category: 'transport',     date: date(1),  description: 'Namma Metro monthly smart card recharge' },

  // ══════════════════════════════════════
  // ██ INCOME — LAST MONTH (31-60 days ago)
  // ══════════════════════════════════════
  { title: 'March Salary',            amount: 85000, type: 'income',  category: 'salary',        date: date(58), description: 'Monthly salary from TechCorp Pvt Ltd' },
  { title: 'Freelance — Mobile App',  amount: 18000, type: 'income',  category: 'freelance',     date: date(52), description: 'Flutter app for e-commerce client — final payment' },
  { title: 'Zerodha P&L',            amount:  4700, type: 'income',  category: 'investment',    date: date(45), description: 'Booked profit from Nifty options trade' },
  { title: 'Anniversary Gift Cash',   amount:  3000, type: 'income',  category: 'gift',          date: date(40), description: 'Gift from in-laws on wedding anniversary' },

  // ══════════════════════════════════════
  // ██ EXPENSES — LAST MONTH
  // ══════════════════════════════════════
  { title: 'Big Basket — March',      amount:  3800, type: 'expense', category: 'food',          date: date(57), description: 'Monthly grocery shopping' },
  { title: 'BESCOM Electricity',      amount:  1950, type: 'expense', category: 'bills',         date: date(56), description: 'March electricity bill' },
  { title: 'Jio Fiber',               amount:   999, type: 'expense', category: 'bills',         date: date(55), description: 'March internet bill' },
  { title: 'Petrol Refill',           amount:  2800, type: 'expense', category: 'transport',     date: date(54), description: 'March fuel expenses' },
  { title: 'Bengaluru Weekend Trip',  amount:  8500, type: 'expense', category: 'entertainment', date: date(53), description: 'Coorg trip — hotel, fuel, food' },
  { title: 'Cult.fit — March',        amount:  2499, type: 'expense', category: 'health',        date: date(51), description: 'Gym membership March' },
  { title: 'Amazon — Desk Lamp',      amount:  1899, type: 'expense', category: 'shopping',      date: date(49), description: 'LED desk lamp for home office' },
  { title: 'Coursera Certificate',    amount:  2800, type: 'expense', category: 'education',     date: date(47), description: 'Google Cloud Associate certification prep' },
  { title: 'Dentist Appointment',     amount:  1500, type: 'expense', category: 'health',        date: date(45), description: 'Dental cleaning + checkup' },
  { title: 'Swiggy March',            amount:  2200, type: 'expense', category: 'food',          date: date(43), description: 'Food delivery orders across March' },
  { title: 'OLA — March Rides',       amount:  1200, type: 'expense', category: 'transport',     date: date(41), description: 'Office + weekend cabs' },
  { title: 'Lenskart — New Glasses',  amount:  4500, type: 'expense', category: 'health',        date: date(39), description: 'Blue-light glasses with anti-glare lens' },
  { title: 'H&M — Jeans',            amount:  2100, type: 'expense', category: 'shopping',      date: date(37), description: '2 jeans on buy-1-get-1 sale' },
  { title: 'Airtel Bill',             amount:   799, type: 'expense', category: 'bills',         date: date(35), description: 'March mobile bill' },
  { title: 'Movie — Kalki 2898 AD',   amount:  800,  type: 'expense', category: 'entertainment', date: date(33), description: 'PVR tickets for 2' },

  // ══════════════════════════════════════
  // ██ INCOME — 2 MONTHS AGO (61-90 days)
  // ══════════════════════════════════════
  { title: 'February Salary',         amount: 85000, type: 'income',  category: 'salary',        date: date(88), description: 'Monthly salary' },
  { title: 'Freelance — UI/UX',       amount: 12000, type: 'income',  category: 'freelance',     date: date(80), description: 'Figma design + prototyping for SaaS client' },
  { title: 'FD Interest Credit',      amount:  2100, type: 'income',  category: 'investment',    date: date(75), description: 'Fixed deposit quarterly interest — SBI' },

  // ══════════════════════════════════════
  // ██ EXPENSES — 2 MONTHS AGO
  // ══════════════════════════════════════
  { title: 'Big Basket — February',   amount:  3600, type: 'expense', category: 'food',          date: date(87), description: 'February groceries' },
  { title: 'Electricity Feb',         amount:  1700, type: 'expense', category: 'bills',         date: date(86), description: 'Electricity bill February' },
  { title: 'Valentine Dinner',        amount:  3800, type: 'expense', category: 'food',          date: date(83), description: 'Fine dining at Ebony rooftop restaurant' },
  { title: 'Nike Running Shoes',      amount:  8999, type: 'expense', category: 'shopping',      date: date(82), description: 'Nike Pegasus 40 — marathon training' },
  { title: 'Cult.fit — Feb',          amount:  2499, type: 'expense', category: 'health',        date: date(80), description: 'Gym membership February' },
  { title: 'Petrol — Feb',            amount:  2600, type: 'expense', category: 'transport',     date: date(79), description: 'February fuel' },
  { title: 'Goa Trip',                amount: 15000, type: 'expense', category: 'entertainment', date: date(77), description: '3-night Goa trip with friends — flights + hotel' },
  { title: 'Python Bootcamp',         amount:  1999, type: 'expense', category: 'education',     date: date(75), description: 'Advanced Python + ML fundamentals bootcamp' },
  { title: 'Swiggy Feb',              amount:  1900, type: 'expense', category: 'food',          date: date(73), description: 'Food deliveries across February' },
  { title: 'PharmEasy Feb',           amount:   650, type: 'expense', category: 'health',        date: date(70), description: 'Monthly medicines + supplements' },
  { title: 'Namma Metro Card',        amount:   500, type: 'expense', category: 'transport',     date: date(68), description: 'Metro smart card recharge' },
  { title: 'Amazon — Monitor Stand',  amount:  2199, type: 'expense', category: 'shopping',      date: date(66), description: 'Ergonomic dual-monitor arm mount' },
  { title: 'Airtel Feb Bill',         amount:   799, type: 'expense', category: 'bills',         date: date(64), description: 'February mobile bill' },
  { title: 'Jio Fiber Feb',           amount:   999, type: 'expense', category: 'bills',         date: date(63), description: 'February internet' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Upsert demo user
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) {
      user = await User.create({ name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD });
      console.log('👤 Created demo user:', DEMO_NAME);
    } else {
      // Update name in case it changed
      user.name = DEMO_NAME;
      await user.save();
      console.log('👤 Demo user found — refreshing data');
    }

    // Wipe old transactions
    const { deletedCount } = await Expense.deleteMany({ user: user._id });
    console.log(`🗑  Cleared ${deletedCount} old transactions`);

    // Insert
    const docs = transactions.map(t => ({ ...t, user: user._id }));
    await Expense.insertMany(docs);

    const totalIncome  = docs.filter(d => d.type === 'income').reduce((s, d) => s + d.amount, 0);
    const totalExpense = docs.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0);

    console.log(`\n✅ Inserted ${docs.length} transactions`);
    console.log(`   💚 Total Income:   ₹${totalIncome.toLocaleString('en-IN')}`);
    console.log(`   ❤️  Total Expense: ₹${totalExpense.toLocaleString('en-IN')}`);
    console.log(`   💰 Net Balance:   ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}`);
    console.log('\n─────────────────────────────────────────');
    console.log('🎉  Seed complete! Open the app and login:');
    console.log(`   Email   : ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log('   URL     : http://localhost:5000');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
