const pool = require("../config/db");
const logger = require("../utils/logger");

// Knowledge base — traffic law Q&A patterns
const knowledgeBase = [
  {
    keywords: ["helmet", "two wheeler", "bike", "scooter"],
    answer: "Wearing a helmet is mandatory for both rider and pillion on two-wheelers under the Motor Vehicles Act. Penalty for not wearing a helmet is ₹1,000 and possible license suspension for 3 months.",
  },
  {
    keywords: ["seatbelt", "seat belt", "car"],
    answer: "Seatbelts are mandatory for all occupants in a car (front and rear seats). Penalty for not wearing seatbelt is ₹1,000.",
  },
  {
    keywords: ["drink", "drunk", "alcohol", "dui"],
    answer: "Drunk driving carries a fine of ₹10,000 and/or up to 6 months imprisonment for the first offense. Repeat offenses lead to ₹15,000 fine and up to 2 years imprisonment.",
  },
  {
    keywords: ["mobile", "phone", "calling", "texting"],
    answer: "Using a mobile phone while driving is prohibited. Penalty is ₹5,000 for the first offense and ₹10,000 for subsequent offenses.",
  },
  {
    keywords: ["speed", "speeding", "overspeed", "limit"],
    answer: "Speeding penalties: ₹1,000–2,000 for light vehicles and ₹2,000–4,000 for heavy vehicles. Repeat offenses can lead to license suspension.",
  },
  {
    keywords: ["signal", "red light", "jump"],
    answer: "Jumping a red signal attracts a fine of ₹1,000–5,000 and may lead to license suspension for 3 months.",
  },
  {
    keywords: ["license", "driving licence", "dl"],
    answer: "Driving without a valid license carries a fine of ₹5,000. You can apply for a learner's license online via the Parivahan Sewa portal.",
  },
  {
    keywords: ["insurance", "third party"],
    answer: "Driving without valid insurance is illegal. Penalty: ₹2,000 and/or 3 months imprisonment for the first offense, ₹4,000 for repeat offenses.",
  },
  {
    keywords: ["puc", "pollution", "emission"],
    answer: "A valid PUC (Pollution Under Control) certificate is mandatory. Driving without it carries a fine of ₹10,000.",
  },
  {
    keywords: ["parking", "no parking", "wrong parking"],
    answer: "Wrong/illegal parking attracts a fine of ₹500–1,000 and the vehicle may be towed away at owner's cost.",
  },
  {
    keywords: ["challan", "pay", "fine", "online"],
    answer: "You can view and pay your challans through the DriveLegal dashboard. Go to 'View My Challans' to see pending fines and pay them securely online.",
  },
  {
    keywords: ["dispute", "wrong challan", "contest", "appeal"],
    answer: "If you believe a challan is incorrect, you can dispute it through the dashboard. Provide evidence and a clear explanation. Disputed challans are reviewed within 7–14 working days.",
  },
  {
    keywords: ["minor", "under 18", "underage"],
    answer: "Minors driving motor vehicles attract a ₹25,000 fine for the guardian/owner, cancellation of vehicle registration for 12 months, and the minor cannot get a license until age 25.",
  },
  {
    keywords: ["hello", "hi", "hey", "namaste"],
    answer: "Hello! 👋 I'm DriveLegal AI Assistant. Ask me anything about traffic rules, challans, fines, or road safety in India.",
  },
  {
    keywords: ["thanks", "thank you", "thx"],
    answer: "You're welcome! Stay safe on the roads. 🚗 Feel free to ask more questions anytime.",
  },
];

const DEFAULT_ANSWER =
  "I'm not sure about that specific query. You can ask me about helmets, seatbelts, speeding, drunk driving, signal jumping, PUC, insurance, license rules, paying challans, or disputing fines. For complex matters, please contact your local RTO.";

// Match user question to knowledge base
const findAnswer = (question) => {
  const q = question.toLowerCase();

  let bestMatch = null;
  let highestScore = 0;

  for (const entry of knowledgeBase) {
    const matchCount = entry.keywords.filter(kw => q.includes(kw.toLowerCase())).length;
    if (matchCount > highestScore) {
      highestScore = matchCount;
      bestMatch = entry;
    }
  }

  return bestMatch ? bestMatch.answer : DEFAULT_ANSWER;
};

// POST /api/chatbot/ask
exports.askChatbot = async (req, res, next) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id || null;

    const answer = findAnswer(question);

    // Log the conversation
    await pool.query(
      "INSERT INTO chatbot_logs (user_id, question, answer) VALUES (?, ?, ?)",
      [userId, question, answer]
    );

    logger.info("Chatbot query", { userId, question: question.substring(0, 80) });

    res.json({
      success: true,
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// GET /api/chatbot/history — get user's chat history
exports.getHistory = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const [rows] = await pool.query(
      `SELECT id, question, answer, created_at
       FROM chatbot_logs
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [req.user.id, Number(limit)]
    );

    res.json({ success: true, count: rows.length, history: rows });
  } catch (err) { next(err); }
};

// DELETE /api/chatbot/history — clear user's chat history
exports.clearHistory = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM chatbot_logs WHERE user_id = ?",
      [req.user.id]
    );

    logger.info("Chat history cleared", { userId: req.user.id, deleted: result.affectedRows });
    res.json({ success: true, message: "Chat history cleared", deleted: result.affectedRows });
  } catch (err) { next(err); }
};

// GET /api/chatbot/suggestions — quick suggested questions
exports.getSuggestions = async (req, res) => {
  const suggestions = [
    "What is the fine for not wearing a helmet?",
    "How do I pay my challan online?",
    "What is the penalty for drunk driving?",
    "Is PUC mandatory in India?",
    "Can I dispute a wrong challan?",
    "What is the speed limit on highways?",
    "What happens if I drive without a license?",
    "What is the fine for using a mobile while driving?",
  ];

  res.json({ success: true, suggestions });
};

// ADMIN: get all chatbot logs (analytics)
exports.getAllLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT cl.id, cl.question, cl.answer, cl.created_at,
              u.name AS user_name, u.email AS user_email
       FROM chatbot_logs cl
       LEFT JOIN users u ON cl.user_id = u.id
       ORDER BY cl.created_at DESC LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    const [[count]] = await pool.query("SELECT COUNT(*) AS total FROM chatbot_logs");

    res.json({
      success: true,
      data: rows,
      pagination: { total: count.total, page: +page, limit: +limit },
    });
  } catch (err) { next(err); }
};
