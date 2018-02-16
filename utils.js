var moment = require("moment");

exports.calculateTimeRange = () => {
    const today = moment();
    const firstCycle = moment("2018-02-11"); //do not change this
    const diffInWeeks = Math.abs(today.diff(firstCycle, "weeks"));
    let firstWeekStart, firstWeekEnd, secondWeekStart, secondWeekEnd;
    if (diffInWeeks % 2 == 0) {
        firstWeekStart = today.clone().startOf("week");
        firstWeekEnd = today.clone().endOf("week");
        secondWeekStart = today
            .clone()
            .add(1, "weeks")
            .startOf("week");
        secondWeekEnd = today
            .clone()
            .add(1, "weeks")
            .endOf("week");
    } else {
        firstWeekStart = today
            .clone()
            .subtract(1, "weeks")
            .startOf("week");
        firstWeekEnd = today
            .clone()
            .subtract(1, "weeks")
            .endOf("week");
        secondWeekStart = today.clone().startOf("week");
        secondWeekEnd = today.clone().endOf("week");
    }

    return {
        firstWeekStart: moment(firstWeekStart),
        firstWeekEnd: moment(firstWeekEnd),
        secondWeekStart: moment(secondWeekStart),
        secondWeekEnd: moment(secondWeekEnd)
    };
};

exports.displayDaysBetweenDates = (startDate, endDate) => {
    const today = startDate.clone();
    const dates = [];
    while (today.isSameOrBefore(endDate)) {
        dates.push(today.format("YYYY-MM-DD"));
        today.add(1, "days");
    }
    return dates;
};
