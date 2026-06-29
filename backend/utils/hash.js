const bcrypt = require("bcryptjs");
const env = require("../config/env");

exports.hashPassword = (plain) => bcrypt.hash(plain, env.bcryptRounds);
exports.comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
