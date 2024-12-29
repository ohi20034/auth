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

    const { statusCode, data, message } = await changePasswordService(
      currentPassword,
      newPassword,
      confirmNewPassword
    );

    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const { statusCode, data, message } = await forgotPasswordService(email);

    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, data, message));
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const { statusCode, data, message } = await resetPasswordService(
      token,
      newPassword
    );

    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, data, message));
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
