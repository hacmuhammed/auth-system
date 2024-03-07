const router = require("express").Router();
const authRoute = require("./auth");
const userRoute = require("./user");

router.use("/auth", authRoute);
router.use("/user", userRoute);

router.use("*", (req, res, next) => {
  return res.status(404).json({
    status: "error",
    message: "There is no url ",
  });
});
module.exports = router;
