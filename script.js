(() => {
    const ICAL_ID = /** @type {const} */("ctdacalendar");
    const ICAL_PRODUCT = /** @type {const} */("CTDA Timetable Exporter");

    const TIMEZONE = "Asia/Ho_Chi_Minh";

    const DAYS_OF_THE_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    const ANY_BR_TAG_REGEX = /<\s*br\s*\/?\s*>/gu;
    
    /**
     * A mapping of semester codes to its beginning and ending dates.
     * @type {Record<string, SemesterDates>}
     */
    const SEMESTER_DATES = {
        "1/23-24": {
            theory: {
                start: new Date("2023-10-02T00:00:00Z"),
                end: new Date("2023-12-17T00:00:00Z"),
            },
            practice: {
                start: new Date("2023-10-09T00:00:00Z"),
                end: new Date("2023-12-17T00:00:00Z"),
            },
            breaks: [
                {
                    // Midterms
                    start: new Date("2023-11-06T00:00:00Z"),
                    end: new Date("2023-11-12T00:00:00Z"),
                }
            ],
        },
        "2/23-24": {
            theory: {
                start: new Date("2024-01-08T00:00:00Z"),
                end: new Date("2024-04-14T00:00:00Z"),
            },
            practice: {
                start: new Date("2024-01-15T00:00:00Z"),
                end: new Date("2024-04-14T00:00:00Z"),
            },
            breaks: [
                {
                    // Lunar New Year
                    start: new Date("2023-01-29T00:00:00Z"),
                    end: new Date("2023-02-18T00:00:00Z"),
                },
                {
                    // Midterms
                    start: new Date("2023-03-04T00:00:00Z"),
                    end: new Date("2023-03-10T00:00:00Z"),
                }
            ]
        },
        "3/23-24": {
            theory: {
                start: new Date("2023-05-13T00:00:00Z"),
                end: new Date("2023-08-18T00:00:00Z"),
            },
            practice: {
                start: new Date("2023-05-20T00:00:00Z"),
                end: new Date("2023-08-18T00:00:00Z"),
            },
            breaks: [
                {
                    // Midterms + Admission 2024
                    start: new Date("2023-06-17T00:00:00Z"),
                    end: new Date("2023-07-14T00:00:00Z"),
                },
            ]
        }
    };

    const UTC_TIMEZONE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });

    const LOCAL_TIMEZONE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: TIMEZONE,
    });

    /**
     * @param {Date} d 
     * @param {Intl.DateTimeFormat} formatter
     * @returns {string}
     */
    function formatISO8601(d, formatter) {
        /**
         * @type {Partial<Record<Intl.DateTimeFormatPartTypes, string>>}
         */
        const parts = {};
        for (const part of formatter.formatToParts(d)) {
            parts[part.type] = part.value;
        }
        return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
    }

    /**
     * @param {string} schedule Raw schedule, e.g. `T2 07:30-09:10 (I.41)`
     * @returns {Generator<Omit<Timerow, "name" | "extras">>}
     */
    function* parseSchedule(schedule) {
        const dates = schedule.split(ANY_BR_TAG_REGEX);
        for (const date of dates) {
            const match = date.match(/(?<dow>T[2-7]|CN) (?<start>\d{1,2}:\d{1,2})-(?<end>\d{1,2}:\d{1,2}) \((?<class>.+?)\)/);
            if (!match || match.length !== 5) {
                throw new Error(`Schedule was not in correct format: ${date}`);
            }

            const [_, dayOfWeek, startHour, endHour, location] = /** @type {[string, string, string, string, string]} */(match);

            const weekday = DAYS_OF_THE_WEEK.indexOf(dayOfWeek);
            if (weekday === -1) {
                throw new Error(`Unknown weekday: ${dayOfWeek}`);
            }

            const startHmStrings = startHour.split(":");
            if (startHmStrings.length !== 2) {
                throw new Error(`Cannot parse start hour: ${startHour}`);
            }
            const startHm = /** @type {[number, number]} */(startHmStrings.map((e) => Number(e)));

            const endHmStrings = endHour.split(":");
            if (endHmStrings.length !== 2) {
                throw new Error(`Cannot parse end hour: ${endHour}`);
            }
            const endHm = /** @type {[number, number]} */(endHmStrings.map((e) => Number(e)));
            
            yield {
                weekday,
                startHm,
                endHm,
                location,
            };
        }
    }

    /**
     * Taken from @bkalendar/core
     * Copyright (c) 2022 BKalendar
     * SPDX-License-Identifier: MIT
     * 
     * @param {[number, number]} hm 
     * @param {Date} startMondayUTC 
     * @param {number} weekday 
     */
    function dateOfIndex(hm, startMondayUTC, weekday) {
        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;        
        return new Date(
            // hm is in UTC+7
            // weekday is between 0-6
            +startMondayUTC + weekday * DAY + (hm[0] - 7) * HOUR + hm[1] * MINUTE,
        );
    }
    
    /**
     * 
     * @param {Date} date 
     * @param {number} days 
     */
    function addDays(date, days) {
        const newDate = new Date(date.valueOf());
        newDate.setDate(date.getDate() + days);
        return newDate;
    }

    /**
     * Taken from @bkalendar/core
     * Copyright (c) 2022 BKalendar
     * SPDX-License-Identifier: MIT
     * 
     * @param {Timerow} tr 
     * @param {Date} startMondayUTC
     * @param {Date} endDate
     * @param {Array<TimeSpan>} excludes
     */
    function formatTimerow(tr, startMondayUTC, endDate, excludes = []) {
        const extraEntries = Object.entries(tr.extras);
        const descriptionRow = [];
        if (extraEntries.length !== 0) {
            const description = extraEntries.map(([k ,v]) => `${k}: ${v}`).join("\\n")
            descriptionRow.push(`DESCRIPTION:${description}`);
        }
        
        const rrules = [
            `RRULE:FREQ=WEEKLY;UNTIL=${formatISO8601(endDate, UTC_TIMEZONE_FORMATTER)}`,
        ];

        const startDate = dateOfIndex(tr.startHm, startMondayUTC, tr.weekday);
        
        // Check if the weekly event coincides with any breaks, and add exceptions.
        if (excludes.length > 0) {
            let currentDate = startDate;
            let excludeCount = 0;
            while (currentDate < endDate) {
                if (excludes.some((span) => span.start <= currentDate && currentDate <= span.end)) {
                    if (excludeCount === 0) {
                        rrules.push(`EXDATE;TZID=${TIMEZONE}`);
                        rrules.push(` :${formatISO8601(currentDate, LOCAL_TIMEZONE_FORMATTER)}`);
                    } else {
                        rrules.push(` ,${formatISO8601(currentDate, LOCAL_TIMEZONE_FORMATTER)}`);
                    }
                    excludeCount++;
                }
                currentDate = addDays(currentDate, 7);
            }
        }

        return [
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}@${ICAL_ID}`,
            `DTSTAMP:${formatISO8601(new Date(), UTC_TIMEZONE_FORMATTER)}`,

            `SUMMARY:${tr.name}`,
            ...descriptionRow,
            `LOCATION:${tr.location}`,

            `DTSTART;TZID=${TIMEZONE}:${
                formatISO8601(
                    dateOfIndex(tr.startHm, startMondayUTC, tr.weekday),
                    LOCAL_TIMEZONE_FORMATTER,
                )
            }`,
            `DTEND;TZID=${TIMEZONE}:${
                formatISO8601(
                    dateOfIndex(tr.endHm, startMondayUTC, tr.weekday),
                    LOCAL_TIMEZONE_FORMATTER,
                )
            }`,
            
            ...rrules,

            "END:VEVENT",
        ]
    }

    /**
     * @param {string} content 
     */
    function deleteHTMLTags(content) {
        const div = document.createElement("div");
        div.innerHTML = content;
        const result = div.innerText;
        div.remove();
        return result;
    }

    if (document.location.pathname !== "/sinh-vien/ket-qua-dkhp") {
        if (
            confirm("You are in the wrong place. To export your timetable, go to https://portal.ctdb.hcmus.edu.vn/sinh-vien/ket-qua-dkhp. Press OK to continue.")
        ) {
            document.location = "/sinh-vien/ket-qua-dkhp";
        }
    }

    const dkhpTable = document.querySelector(".ModCTDBSVKetQuaDKHPC");
    if (!dkhpTable) {
        alert("Timetable not found?! Cannot export timetable without one.");
        return;
    }

    /**
     * @type {DKHPViewModel}
     */
    const vmDKHP = ko.dataFor(dkhpTable);
    const ketQuaDKHP = vmDKHP.dsKetQuaDKHP();
    console.log(`ketQuaDKHP: ${ketQuaDKHP}`);

    if (ketQuaDKHP.length === 0) {
        alert("Nothing to export.")
        return;
    }

    const ical = [
        "BEGIN:VCALENDAR",
		`PRODID:-//${ICAL_ID}//${ICAL_PRODUCT}//VI`,
		"VERSION:2.0",
		// https://github.com/touch4it/ical-timezones/blob/master/lib/zones/Asia/Ho_Chi_Minh.ics
		"BEGIN:VTIMEZONE",
		"TZID:Asia/Ho_Chi_Minh",
		"TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Ho_Chi_Minh",
		"X-LIC-LOCATION:Asia/Ho_Chi_Minh",
		"BEGIN:STANDARD",
		"TZOFFSETFROM:+0700",
		"TZOFFSETTO:+0700",
		"TZNAME:+07",
		"DTSTART:19700101T000000",
		"END:STANDARD",
		"END:VTIMEZONE",
    ];
    for (const subject of ketQuaDKHP) {
        /**
         * @type {Timerow | null}
         */
        let timerow = null;

        const dates = SEMESTER_DATES[subject.HocKy];
        if (!dates) {
            throw new Error(`Start and end dates for this semester has not been added. Please contact the script developer.`);
        }

        /**
         * @type {Record<string, string>}
         */
        const commonExtras = {};

        if (subject.GVTroGiang) {
            commonExtras["Trợ giảng"] = subject.GVTroGiang.replace(ANY_BR_TAG_REGEX, ", ");
        }

        if (subject.GhiChu) {
            commonExtras["Ghi chú"] = deleteHTMLTags(subject.GhiChu).replace(/^Ghi chú:\s*/, "");
        
        }

        if (subject.LichHocLT) {
            const calendarTitle = `[${subject.KyHieu}] [LT] ${subject.TenMH}`;

            for (const schedule of parseSchedule(subject.LichHocLT)) {
                timerow = {
                    ...schedule,
                    name: calendarTitle,
                    extras: {
                        "Giáo viên": subject.GVLyThuyet.replace(ANY_BR_TAG_REGEX, ", "),
                        ...commonExtras,
                    },
                };
                ical.push(...formatTimerow(timerow, dates.theory.start, dates.theory.end, dates.breaks))
            }
        }

        if (subject.LichHocTH) {
            const calendarTitle = `[${subject.KyHieu}] [TH] ${subject.TenMH}`;

            for (const schedule of parseSchedule(subject.LichHocTH)) {
                timerow = { 
                    ...schedule,
                    name: calendarTitle,
                    extras: {
                        "Giáo viên": subject.GVThucHanh.replace(ANY_BR_TAG_REGEX, ", "),
                        ...commonExtras,
                    },
                }
                ical.push(...formatTimerow(timerow, dates.practice.start, dates.practice.end, dates.breaks))
            }
        }
    }
    ical.push("END:VCALENDAR");

    const calendar = ical.join("\r\n");

    const semesterCode = vmDKHP.selectedMaHK();
    const semesterList = vmDKHP.dsHocKy();

    const semester = semesterList.find((s) => s.MaHK === semesterCode);

    const filename = semester 
        ? `${semester.TenHK}.ics`
        : "Unknown Semester.ics";

    const anchor = document.createElement("a");
    anchor.href = `data:text/calendar,${encodeURIComponent(calendar)}`;
    anchor.download = filename;
    anchor.click();
    anchor.remove();
})();
