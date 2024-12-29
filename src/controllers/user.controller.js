const { User } = require("../models/user.model");
const {
  registerUserService,
  loginService,
  refreshAccessTokenService,
  logoutService,
} = require("../services/user.service");

const jwt = require("jsonwebtoken");
const { ApiResponse } = require("../utils/apiResponse");
const { ApiError } = require("../utils/apiError");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cookieOptions = require("../utils/cookieOptions");

const registerUser = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;

    console.log(email, name, password);

    const { statusCode, data, message } = await registerUserService(
      email,
      name,
      password
    );

    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, data, message));
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { statusCode, accessToken, refreshToken, message, data } =
      await loginService(email, password);

    return res
      .status(statusCode)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(new ApiResponse(statusCode, data, message));
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const { statusCode, data, message } = await logoutService(req.user._id);
    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, data, message));
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const inComingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    const { statusCode, accessToken, newRefreshToken, message } =
      await refreshAccessTokenService(inComingRefreshToken);

    return res
      .status(statusCode)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          statusCode,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          message
        )
      );
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    console.log(currentPassword, newPassword, confirmNewPassword);
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

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
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
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Password reset email sent successfully.")
      );
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  console.log(token, newPassword);

  try {
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
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Password reset successful. You can now log in with your new password."
        )
      );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
};
