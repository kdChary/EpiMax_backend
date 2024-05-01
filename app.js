const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");

const bcrypt = require("bcrypt");
const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json(), cors());

/* app.get("/", (req, res) => {
    res.send("Hello");
}); */

// * Initializing and Starting the server.
let db = null;

const setServerAndDb = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "dataBase.db"),
      driver: sqlite3.Database,
    });
    app.listen(3004, () =>
      console.log(`Server running at: "http://localhost:3004"`)
    );
  } catch (err) {
    console.log(`DataBase Error: ${err.message}`);
    process.exit(1);
  }
};

setServerAndDb();

const secretKey = "EpiMax";
let userId;

const changeCase = (data) => ({
  id: data.id,
  task: data.task,
  description: data.description,
  status: data.status,
  assigneeId: data.assignee_id,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// middleware function for authorization.
const authorizeUser = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  // console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    // console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, secretKey, async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access Token");
      } else {
        next();
      }
    });
  }
};

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
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const getUser = `SELECT * FROM Users WHERE username = '${username}';`;
  const dbUser = await db.get(getUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const checkPassword = await bcrypt.compare(password, dbUser.password_hash);

    if (checkPassword) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, secretKey);
      console.log(jwtToken);
      userId = dbUser.id;

      response.status(200);
      response.send("Login Successful");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// *API to create a new task - POST /task
app.post("/task", authorizeUser, async (request, response) => {
  const { title, description, status, createdAt, updatedAt } = request.body;

  const addTaskQuery = `
      INSERT INTO
        Tasks(title,description,status,assignee_id,created_at,updated_at)
        VALUES("${title}","${description}","${status}",${userId},"${createdAt}","${updatedAt}");
    `;

  const task = await db.run(addTaskQuery);

  response.send("Task Created Successfully");
});

// *API to GET all tasks - GET /tasks
app.get("/tasks", authorizeUser, async (request, response) => {
  const getTasksQuery = `SELECT * FROM Tasks;`;
  const tasks = await db.all(getTasksQuery);

  const modifiedTasks = tasks.map((task) => changeCase(task));
  response.status(200);
  response.send(modifiedTasks);
});

// *API to retrieve a specific task by ID - GET /tasks/:id
app.get("/tasks/:id", authorizeUser, async (request, response) => {
  const { id } = request.params;
  const getTasksQuery = `SELECT * FROM Tasks WHERE id=${id};`;
  const task = await db.get(getTasksQuery);

  const modifiedTask = changeCase(task);
  response.status(200);
  response.send(modifiedTask);
});

// *API to update a specific task by ID - PUT /tasks/:id
app.put("/tasks/:id", authorizeUser, async (request, response) => {
  const { id } = request.params;
  const { title, description, status, updatedAt } = request.body;

  const updateTaskQuery = `
  UPDATE
    Tasks
    SET
      (title="${title}",description="${description}",status="${status}",assignee_id=${userId},updated_at="${updatedAt}")
      WHERE id = ${id};`;

  const task = await db.run(updateTaskQuery);
  response.status(200);
  response.send(changeCase(task));
});

// *API to delete a specific task by ID - DELETE /tasks/:id
app.delete("/tasks/:id", async (request, response) => {
  const { id } = request.params;
  const deleteTaskQuery = `
      DELETE FROM
        Tasks
      WHERE
        id = ${id};`;
  await db.run(deleteTaskQuery);
  response.send("Task Removed");
});
