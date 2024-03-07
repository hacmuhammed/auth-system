const router = require("express").Router();
const authController = require("../controllers/auth");

//Routes
router.post("/login", authController.login);
router.post("/register", authController.register, authController.sendOTP);
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.delete(
  "/delete-account",
  authController.protect,
  authController.deleteMyAccount
);
//==Routes==

//Exports
module.exports = router;
//==Exports==
