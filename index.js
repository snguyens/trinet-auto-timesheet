const axios = require("axios");

axios.get("https://sso.trinet.com/auth/UI/Login").then(
    res => {
        console.log(res.data)
    });