const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const {
  randomString,
  containsAll,
  decodeAuthCredentials,
  timeout,
} = require("./utils");

const config = {
  port: 9001,
  privateKey: fs.readFileSync("assets/private_key.pem"),

  clientId: "my-client",
  clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
  redirectUri: "http://localhost:9000/callback",

  authorizationEndpoint: "http://localhost:9001/authorize",
};

const clients = {
  "my-client": {
    name: "Sample Client",
    clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
    scopes: ["permission:name", "permission:date_of_birth"],
  },
  "test-client": {
    name: "Test Client",
    clientSecret: "TestSecret",
    scopes: ["permission:name"],
  },
};

const users = {
  user1: "password1",
  john: "appleseed",
};

const requests = {};
const authorizationCodes = {};

let state = "";

const app = express();
app.set("view engine", "ejs");
app.set("views", "assets/authorization-server");
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*
Your code here
*/

app.get("/authorize", ({ query }, res) => {
  const { client_id: clientId } = query;

  if (clientId in clients) {
    const { scope } = query;
    const hasScopePermission = containsAll(
      clients[clientId].scopes,
      String(scope).split(" ")
    );
    if (hasScopePermission) {
      const requestId = randomString();
      requests[requestId] = query;
      return res.render("login", {
        client: clients[clientId],
        scope,
        requestId,
      });
    }
  }
  return res.status(401).end();
});

app.post("/approve", (req, res) => {
  const { body } = req;
  const { userName, password, requestId } = body;
  const isPasswordMatch = users[userName] === password;
  if (isPasswordMatch) {
    if (requestId in requests) {
      const clientRequest = requests[requestId];
      delete requests[requestId];
      const reqId = randomString();
      authorizationCodes[reqId] = {
        clientReq: clientRequest,
        userName,
      };
      const { redirect_uri: redirectTo, state } = clientRequest;
      const url = new URL(redirectTo);
      url.searchParams.append("code", reqId);
      url.searchParams.append("state", state);
      return res.redirect(url.href);
    }
  }
  return res.status(401).end();
});

app.post("/token", ({ headers, body }, res) => {
  if (headers.authorization) {
    const { clientId, clientSecret } = decodeAuthCredentials(
      headers.authorization
    );
    if (clientId in clients) {
      if (clients[clientId].clientSecret === clientSecret) {
        const { code } = body;
        if (code in authorizationCodes) {
          const authorizationCode = authorizationCodes[code];
          delete authorizationCodes[code];
          const privateKey = fs.readFileSync(
            path.join(__dirname, "assets", "private_key.pem")
          );
          const token = jwt.sign(
            {
              userName: authorizationCode.userName,
              scope: authorizationCode.clientReq.scope,
            },
            privateKey,
            {
              algorithm: "RS256",
            }
          );
          return res.status(200).json({
            access_token: token,
            token_type: "Bearer",
          });
        }
      }
    }
  }
  return res.status(401).end();
});

const server = app.listen(config.port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
});

// for testing purposes

module.exports = { app, requests, authorizationCodes, server };
