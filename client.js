const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const { randomString, timeout } = require("./utils");

const config = {
  port: 9000,

  clientId: "my-client",
  clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
  redirectUri: "http://localhost:9000/callback",

  authorizationEndpoint: "http://localhost:9001/authorize",
  tokenEndpoint: "http://localhost:9001/token",
  userInfoEndpoint: "http://localhost:9002/user-info",
};
let state = "";

const app = express();
app.set("view engine", "ejs");
app.set("views", "assets/client");
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*
Your code here
*/

app.get("/authorize", (_, res) => {
  state = randomString();
  const redirectTo = new URL(config.authorizationEndpoint);
  redirectTo.searchParams.append("response_type", "code");
  redirectTo.searchParams.append("client_id", config.clientId);
  redirectTo.searchParams.append("redirect_uri", config.redirectUri);
  redirectTo.searchParams.append(
    "scope",
    "permission:name permission:date_of_birth"
  );
  redirectTo.searchParams.append("state", state);
  return res.redirect(redirectTo.href);
});

app.get("/callback", ({ query }, res) => {
  if (query.state !== state) {
    return res.status(403).end();
  }
  authenticate(query.code)
    .then(getUserInfo)
    .then(({ data: user }) => {
      res.render("welcome", { user });
    });
});

function getUserInfo({ data: { access_token } }) {
  return axios({
    method: "GET",
    url: config.userInfoEndpoint,
    headers: {
      authorization: `bearer ${access_token}`,
    },
  });
}

function authenticate(code) {
  return axios({
    auth: {
      username: config.clientId,
      password: config.clientSecret,
    },
    method: "POST",
    url: config.tokenEndpoint,
    data: {
      code,
    },
  });
}

const server = app.listen(config.port, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
});

// for testing purposes

module.exports = {
  app,
  server,
  getState() {
    return state;
  },
  setState(s) {
    state = s;
  },
};
