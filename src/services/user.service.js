const { User } = require("../models/user.model");

const createUser = async (name, email, password) => {
  try {
    const user = new User({
      name,
      email,
      password,
    });

    return await user.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Email already exists");
    }
    throw new Error(`Error creating user: ${error.message}`);
  }
};

module.exports = { createUser };
