const router = require("express").Router();
const { chat } = require("../controllers/chatbotController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.post("/chat", chat);

module.exports = router;
