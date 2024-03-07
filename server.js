const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");

//
dotenv.config({
  path: "./config.env",
});

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const server = http.createServer(app);

const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);
mongoose.set("strictQuery", true);
mongoose
  .connect(DB, {})
  .then((con) => console.log("DB connection is successfully established"))
  .catch((err) => console.log(err));

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App running on port ${port}`);
});
