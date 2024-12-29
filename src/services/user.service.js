const { User } = require("../models/user.model");
const { ApiError } = require("../utils/apiError");

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUserService = async (email, name, password) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "Email is already in use");
  }

  const user = new User({
    email,
    name,
    password,
  });

  await user.save();

  return {
    statusCode: 201,
    message: "User created successfully",
    data: {
      user: {
        name: user.name,
        email: user.email,
      },
    },
  };
};

const loginService = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentias");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return {
    statusCode: 201,
    accessToken,
    refreshToken,
    message: "User Logged In Successfuly",
    data: {
      user: loggedInUser,
      accessToken,
      refreshToken,
    },
  };
};
const refreshAccessTokenService = async (inComingRefreshToken) => {
  if (!inComingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    inComingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  if (inComingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh Token is expired or used");
  }

  const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return {
    statusCode: 200,
    accessToken,
    newRefreshToken,
    data: {},
    message: "Access Token refreshed Successfully",
  };
};

const logoutService = async (userId) => {
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  return {
    statusCode: 200,
    data: {},
    message: "User logged Out Successfuly",
  };
};
const changePasswordService = async (
  currentPassword,
  newPassword,
  confirmNewPassword
) => {
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!(await user.isPasswordCorrect(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  if (await user.isPasswordCorrect(newPassword)) {
    throw new ApiError(
      400,
      "New password cannot be the same as the current password"
    );
  }

  user.password = newPassword;
  await user.save();

  return {
    statusCode: 200,
    data: {},
    message: "Password changed successfully",
  };
};
const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const resetUrl = `localhost:3000/api/v1/auth/reset-password/${resetToken}`;

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordTokenExpires = Date.now() + 3600000;
  await user.save({ validateBeforeSave: false });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: true,
    auth: {
      user: process.env.USER_FOR_NODEMAILER,
      pass: process.env.USER_PASS_NODEMAILER,
    },
  });

  const mailcookieOptions = {
    from: {
      name: "Forgot Password",
      address: process.env.USER_FOR_NODEMAILER,
    },
    to: email,
    subject: "Password Reset Request",
    html: `<p>You are receiving this email because you (or someone else) have requested the reset of a password.</p>
             <p>If this was not you, please ignore this email. Otherwise, click the link below to reset your password:</p>
             <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
             <p> ${resetUrl} </p>
             <p>This link will expire in 1 hour.</p>`,
  };

  await transporter.sendMail(mailcookieOptions);

  return {
    statusCode: 200,
    data: {},
    message: "Password reset email sent successfully.",
  };
};
const resetPasswordService = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  console.log(hashedToken);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (Date.now() > user.resetPasswordTokenExpires) {
    throw new ApiError(400, "Reset token has expired");
  }

  user.password = newPassword;
  user.resetPasswordToken = "";
  user.resetPasswordExpires = undefined;

  await user.save();

  return {
    statusCode: 200,
    data: {},
    message:
      "Password reset successful. You can now log in with your new password.",
  };
};
module.exports = {
  registerUserService,
  loginService,
  refreshAccessTokenService,
  logoutService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
};
