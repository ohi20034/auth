const { User } = require("../models/user.model");

const registerUser = async (name, email, password) => {
  try {
    const user = new User({
      name,
      email,
      password,
    });
    return await user.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, "Email already exists");
    }
    throw new ApiError(500, "An error occurred while registering the user");
  }
};

module.exports = { registerUser };
