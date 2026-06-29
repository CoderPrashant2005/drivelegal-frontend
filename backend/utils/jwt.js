const jwt = require("jsonwebtoken");
const env = require("../config/env");

exports.signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

exports.signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

exports.verifyAccessToken = (token) => jwt.verify(token, env.jwt.secret);
exports.verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);
