var axios = require("axios");
var querystring = require("querystring");
var _ = require("lodash");
var config = require("./config.json");

function authenticate(username, password) {
     return axios({
          url: "https://sso.trinet.com/auth/UI/Login",
          method: "POST",
          headers: {
               "Content-Type": "application/x-www-form-urlencoded"
          },
          data: querystring.stringify({
               IDToken1: username,
               IDToken2: password,
               "Login.Submit": "LOGIN",
               realm: "sw_hrp",
               module: "emplid"
          }),
          maxRedirects: 0 //need to disable redirects for this request
     })
          .then(res => {
               //a 200 response is sent back if the content-type header is not set correctly
               return Promise.reject("The authentication request has failed!");
          })
          .catch(err => {
               //a 302 response is sent back if the content-type header is set correctly
               //but has missing/invalid values in the request body
               if (
                    _.get(err, "response.status") == 302 &&
                    _.get(err, "response.headers.set-cookie")
               ) {
                    const cookies = err.response.headers["set-cookie"];
                    for (let cookie of cookies) {
                         if (cookie.startsWith("TriNetAuthCookie")) {
                              return Promise.resolve(
                                   cookie.split(";")[0].split("=")[1]
                              );
                         }
                    }
               }
               return Promise.reject(
                    "The credentials you have provided are invalid!"
               );
          });
}

authenticate(config.employeeId, config.password)
     .then(token => {
          //...
          console.log(token);
     })
     .catch(err => console.log(err));
