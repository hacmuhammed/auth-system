const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
//
const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

//Register New User

exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required.",
    });
  }
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid email format.",
    });
  }

  // Check other validations using express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    // user with this email already exists, Please login
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // if not verified than update prev one

    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    req.userId = existing_user._id;
    next();
  } else {
    const new_user = await User.create(filteredBody);

    req.userId = new_user._id;
    next();
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  // mailService.sendEmail({
  //   from: "yourmail@gmail.com",
  //   to: user.email,
  //   subject: "Verification OTP",
  //   html: otp(user.firstName, new_otp),
  //   attachments: [],
  // });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
});

exports.verifyOTP = async (req, res, next) => {
  try {
    // Verify OTP and update user record

    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      otp_expiry_time: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Email is invalid or OTP is expired",
      });
    }

    const isCorrectOTP = await user.correctOTP(otp, user.otp);

    if (!isCorrectOTP) {
      return res.status(400).json({
        status: "error",
        message: "OTP is incorrect",
      });
    }

    // OTP is correct
    user.verified = true;
    user.otp = undefined;

    await user.save({ new: true, validateModifiedOnly: true });
    const token = signToken(user._id);
    return res.status(200).json({
      status: "success",
      message: "OTP Verified Successfully",
      token,
      user_id: user._id,
    });
  } catch (error) {
    console.error("Error in verifying OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

//Login User
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "There is no user with this email.",
    });
    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
});

//Potect API to only use by user
exports.protect = async (req, res, next) => {
  try {
    // 1- Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    } else {
      return res.status(400).json({
        status: "error",
        message: "You are not logged in! Please log in to get access",
      });
    }

    // 2- Verification Token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3- Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "The user does not exist",
      });
    }

    // 4- Check if user changed their password
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(400).json({
        status: "error",
        message: "User recently changed password!. Please log in again",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token. Please log in again",
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  // 1- Get the users email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "There is no user with that email",
    });
    return;
  }

  // 2- Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  try {
    console.log(resetToken);
    res.status(200).json({
      status: "success",
      message: "Reset password link sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({
      status: "error",
      message: "There was an error sending the email, please try again later",
    });
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  console.log(user);
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }
  // Check if password and passwordConfirm match
  if (req.body.password !== req.body.passwordConfirm) {
    return res.status(400).json({
      status: "error",
      message: "Passwords do not match",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reseted Successfully",
    token,
  });
});

exports.deleteMyAccount = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      status: "error",
      message: "Password is required to delete the account",
    });
  }
  const isCorrectPassword = await user.correctPassword(password, user.password);
  if (!isCorrectPassword) {
    return res.status(401).json({
      status: "error",
      message:
        "Incorrect password. Please provide the correct password to delete your account",
    });
  }

  await User.findByIdAndDelete(user._id);
  res.status(200).json({
    status: "success",
    message: "Your account has been successfully deleted",
  });
});
