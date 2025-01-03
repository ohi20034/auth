const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword
} = require("../controllers/user.controller");

const { verifyJWT } = require("../middlewares/auth.middleware");

router.post("/registerUser", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT, changePassword);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
