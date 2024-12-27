const { User } = require("../models/user.model");
const userService = require("../services/user.service");
const jwt = require("jsonwebtoken");
const { ApiResponse } = require("../utils/apiResponse");
const { ApiError } = require("../utils/apiError");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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

const registerUser = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      throw new ApiError(401, "Email, name, and password are required");
    }
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
    res.status(201).json({
      message: "User created successfully",
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log(email, password);

    if (!email || !password) {
      throw new ApiError(400, "email or password is required");
    }

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

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User Logged In Successfuly"
        )
      );
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: "",
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User logged Out Successfuly"));
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const inComingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

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

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed Successfully"
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

    const options = {
      httpOnly: true,
      secure: true,
    };

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

    user.resetPasswordTokenExpires = (await Date.now()) + 3600000;
    const newUser = await user.save({ validateBeforeSave: false });
    console.log(newUser);
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

    const mailOptions = {
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

    await transporter.sendMail(mailOptions);
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

  console.log(token,newPassword);

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    console.log(hashedToken);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
    });

    if (!user) {
      throw new ApiError(404, "User not found");
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
