const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { timeout } = require("./utils");
const jwt = require("jsonwebtoken");

const config = {
  port: 9002,
  publicKey: fs.readFileSync("assets/public_key.pem"),
};

const users = {
  user1: {
    username: "user1",
    name: "User 1",
    date_of_birth: "7th October 1990",
    weight: 57,
  },
  john: {
    username: "john",
    name: "John Appleseed",
    date_of_birth: "12th September 1998",
    weight: 87,
  },
};

const app = express();
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*
Your code here
*/

app.get("/user-info", ({ headers }, res) => {
  if (headers.authorization) {
    const token = headers.authorization.slice(7);
    try {
      const decodedPayload = jwt.verify(token, config.publicKey, {
        algorithms: ["RS256"],
      });
      if (typeof decodedPayload === "object") {
        const { userName, scope: scopesString } = decodedPayload;
        if (userName in users) {
          const { [userName]: userWithAllAttributes } = users;
          const result = String(scopesString)
            // build array of scopes
            .split(" ")
            // turn each scope into an attribute
            .map((scope) => scope.replace("permission:", ""))
            .reduce(
              (scopeAttributes, attribute) => ({
                ...scopeAttributes,
                [attribute]: userWithAllAttributes[attribute],
              }),
              {}
            );
          res.status(200).json(result);
        }
      }
    } catch {}
  }
  return res.status(401).end();
});

const server = app.listen(config.port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
});

// for testing purposes
module.exports = {
  app,
  server,
};
