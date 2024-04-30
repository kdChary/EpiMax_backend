const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { v4 } = require("uuid");

const app = express();
app.use(express.json(), cors());

// * Initializing and Starting the server.
let db = null;

const setServerAndDb = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "dataBase.db"),
      driver: sqlite3.Database,
    });
    app.listen(3004, () =>
      console.log(`Server running at: "http://localhost:5000"`)
    );
  } catch (err) {
    console.log(`DataBase Error: ${err.message}`);
    process.exit(1);
  }
};

setServerAndDb();

// *API for user registration
app.post("/register", async (request, response) => {
  // Destructuring data from the response body
  const { id, username, password } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const getDbUser = `SELECT * FROM Users WHERE username = '${username}'`;
  const dbUser = await db.get(getDbUser);

  if (dbUser === undefined) {
    const userId = v4();

    const registerNewUser = `
      INSERT INTO
        Users ( username, password_hash)
      VALUES ( '${username}', '${hashedPassword}');`;

    await db.run(registerNewUser);
    response.status(200);
    response.send("User registered");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// *API to login User

// *API to create a new task - POST /task

// *API to GET all tasks - GET /tasks

// *API to retrieve a specific task by ID - GET /tasks/:id

// *API to update a specific task by ID - PUT /tasks/:id

// *API to delete a specific task by ID - DELETE /tasks/:id
