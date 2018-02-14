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
        firstWeekStart: firstWeekStart.format("YYYY-MM-DD"),
        firstWeekEnd: firstWeekEnd.format("YYYY-MM-DD"),
        secondWeekStart: secondWeekStart.format("YYYY-MM-DD"),
        secondWeekEnd: secondWeekEnd.format("YYYY-MM-DD")
    };
};
