var axios = require("axios");
var querystring = require("querystring");
var _ = require("lodash");
var config = require("./config.json");
var timesheet = require("./timesheet.json");
var { calculateTimeRange, displayDaysBetweenDates } = require("./utils");

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
            //need to check against missing/invalid fields in the request body
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
            console.log(err);
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

function readTimeEntries() {
    const {
        firstWeekStart,
        firstWeekEnd,
        secondWeekStart,
        secondWeekEnd
    } = calculateTimeRange();
    const listOfDays = displayDaysBetweenDates(firstWeekStart, secondWeekEnd);
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];
    let timeSheetPayload = "timeSheetDetails=[";
    timeSheetPayload += constructTimeSheetPayload(days, listOfDays, 1);
    timeSheetPayload += constructTimeSheetPayload(days, listOfDays, 2);
    timeSheetPayload = timeSheetPayload.slice(0, -1);
    timeSheetPayload += `]&isExpressEntry=true&From=${firstWeekStart} 00:00:00&To=${secondWeekEnd} 00:00:00`;
    return timeSheetPayload;
}

function constructTimeSheetPayload(days, listOfDays, week) {
    let timeSheetPayload = ``;
    for (let i = 0; i < days.length; i++) {
        const entries = timesheet.week1[days[i]];
        const date = listOfDays[i + (week == 2 ? 7 : 0)].split("-");
        const year = date[0],
            month = date[1],
            day = date[2];
        if (entries.length == 0) {
            timeSheetPayload += `{"Type":"-1","Date":"${year}-${month}-${day} 00:00:00","StartTime":"08:00 AM","EndTime":"","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"false","isTransfer":""},`;
            continue;
        }
        for (let entry of entries) {
            entry = entry.split(/:(.+)/);
            const actionType = entry[0] === "meal" ? -2 : -1;
            const timeInterval = entry[1].split("-");
            const startTime = timeInterval[0]
                ? timeInterval[0].trim()
                : "08:00 AM";
            const endTime = timeInterval[1] ? timeInterval[1].trim() : "";
            timeSheetPayload += `{"Type":"${actionType}","Date":"${year}-${month}-${day} 00:00:00","StartTime":"${startTime}","EndTime":"${endTime}","Hours":0,"Column1Value":0,"Column2Value":0,"Column3Value":0,"Column4Value":0,"Column5Value":0,"Column6Value":0,"Column7Value":0,"TimeSlicePreIDIn":"","TimeSlicePreIDOut":"","isDeleted":"false","isModified":"true","isTransfer":""},`;
        }
    }
    return timeSheetPayload
}

function submitTimeSheet(cloudCookies) {
    const requestCookie =
        cloudCookies[0].split(";")[0] + "; " + cloudCookies[1].split(";")[0];
    const authCookieName = cloudCookies[1].split(";")[0].split(/=(.+)/);
    const queryParameter = authCookieName[0][0];
    const value = authCookieName[0].substring(1);
    return axios({
        url: `https://trinet.cloud.centralservers.com/EmployeeHome/EmployeeHome/SubmitTimesheetEntryDetails?${queryParameter}=${value}`,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: requestCookie
        },
        data: readTimeEntries()
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
        console.log(
            " Attempting to authenticate with provided credentials in config file..."
        );
        const token = await authenticate(config.employeeId, config.password);
        console.log(" Attempting to retrieve SSO server URL...");
        const ssoServerURL = await retrieveSSOServerURL(token);
        console.log(
            " Attempting to retrieve cookies to establish cloud session..."
        );
        const cloudCookies = await establishCloudSession(ssoServerURL);
        console.log(
            " Attempting to set time sheet with provided times in config file..."
        );
        const timesheet = await submitTimeSheet(cloudCookies);
        console.log(
            "\x1b[32m",
            "Congratulations, you have successfully set your time sheet!",
            "\x1b[0m"
        );
    } catch (err) {
        console.log(err);
    }
})();
