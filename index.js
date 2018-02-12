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
               //but has missing/invalid fields in the request body
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

function retrieveSSOServerURL(token) {
     return axios({
          url: `https://beta.hrpassport.com/api-sso/v1/sso/KIM/${
               config.employeeId
          }/sso-artifacts/stratustime?peoId=PAS&param=`,
          method: "GET",
          headers: {
               Cookie: `TriNetAuthCookie=${token}`
          }
     }).then(res => {
          if (_.get(res, "data.data.ssoServerURL")) {
               return Promise.resolve(res.data.data.ssoServerURL);
          }
          return Promise.reject("Retrieving SSO Server URL has failed!");
     });
}

async function pullTimeSheet() {
     try {
          const token = await authenticate(config.employeeId, config.password);
          const url = await retrieveSSOServerURL(token);
          console.log(url);
     } catch (err) {
          console.log(err);
     }
}

pullTimeSheet();
