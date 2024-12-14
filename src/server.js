const dotenv = require("dotenv");
const { connectDB } = require("./config/db");
const { app } = require("./app");

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

startServer();
