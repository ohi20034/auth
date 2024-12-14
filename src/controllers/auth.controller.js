const userService = require('../services/user.service');

const createUser = async (req, res, next) => {
    const { email, name, password } = req.body; // destructuring assignment
    const user = await userService.createUser(name, email, password);
    res.status(201).json({
        message: 'User created successfully',
        user: {
            name: user.name,
            email: user.email,
        }
    });
};

module.exports = { createUser };