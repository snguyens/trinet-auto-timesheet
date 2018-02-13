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
     })
          .then(res => {
               if (_.get(res, "data.data.ssoServerURL")) {
                    return Promise.resolve(res.data.data.ssoServerURL);
               }
               return Promise.reject("Retrieving SSO Server URL has failed!");
          })
          .catch(err => {
               return Promise.reject(
                    "An error has occurred while trying to retrieve the SSO Server URL!"
               );
          });
}

function establishCloudSession(ssoServerURL) {
     return axios({
          url: ssoServerURL,
          method: "GET",
          maxRedirects: 0
     })
          .then(() => {
               return Promise.reject(
                    "There was a problem while trying to retrieve the cookies needed for the cloud domain!"
               );
          })
          .catch(err => {
               if (
                    _.get(err, "response.status") == 302 &&
                    _.get(err, "response.headers.set-cookie")
               ) {
                    const cookies = err.response.headers["set-cookie"];
                    return Promise.resolve(cookies);
               }
               return Promise.reject(
                    "There was a problem while trying to retrieve the cookies needed for the cloud domain!"
               );
          });
}

const timeSheetPayload = `timeSheetDetails=[{"Type":"-1","Date":"2018-02-11 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-12 00:00:00","StartTime":"08:00 AM","EndTime":"10:00 AM","Hours":2,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"24710","TimeSlicePreIDOut":"24711","isDeleted":"false","isModified":"true","isTransfer":"false"},{"Type":"-1","Date":"2018-02-12 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-13 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-14 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-15 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-16 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},{"Type":"-1","Date":"2018-02-17 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""}]&isExpressEntry=true&From=2018-02-11 00:00:00&To=2018-02-17 00:00:00`;

function setTimeSheet(cloudCookies) {
     let queryParameter, value;
     for (let cookie of cloudCookies) {
          if (cookie.startsWith("PreferedLanguage")) continue;
          const auth = cookie.split(";")[0].split(/=(.+)/);
          queryParameter = auth[0][0];
          value = auth[0].substring(1);
          break;
     }
     const requestCookie =
          cloudCookies[0].split(";")[0] + "; " + cloudCookies[1].split(";")[0];
     return axios({
          url: `https://trinet.cloud.centralservers.com/EmployeeHome/EmployeeHome/SubmitTimesheetEntryDetails?${queryParameter}=${value}`,
          method: "POST",
          headers: {
               "Content-Type": "application/x-www-form-urlencoded",
               Cookie: requestCookie
          },
          data: timeSheetPayload
     })
          .then(res => {
               if (_.get(res, "data.__error")) {
                    return Promise.reject(
                         "There was an error while trying to set your time sheet!"
                    );
               }
               return Promise.resolve(
                    "Congratulations, you have successfully set your time sheet!"
               );
          })
          .catch(err => {
               return Promise.reject(
                    "An error has occurred while setting your time sheet!"
               );
          });
}

(async () => {
     try {
          const token = await authenticate(config.employeeId, config.password);
          const ssoServerURL = await retrieveSSOServerURL(token);
          const cloudCookies = await establishCloudSession(ssoServerURL);
          const timesheet = await setTimeSheet(cloudCookies);
          console.log(timesheet);
     } catch (err) {
          console.log(err);
     }
})();
