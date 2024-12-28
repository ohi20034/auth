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