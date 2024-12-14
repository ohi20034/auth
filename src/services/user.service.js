const { User } = require("../models/user.model");
const bcrypt = require("bcrypt");

const createUser = async (name, email, password) => {
  try {
    const saltRounds = parseInt(process.env.SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashedPassword,
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
