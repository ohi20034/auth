const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
} = require("../controllers/user.controller");
const { verifyJWT } = require("../middlewares/auth.middleware");

// router.post("/registerUser", registerUser);
// route.post("/login", loginUser);
// route.post("/logout", verifyJWT, logoutUser);

module.exports = router;
