/// <reference types="@types/knockout" />
/// <reference types="@types/toastr" />
/// <reference types="@types/jquery" />

(async () => {
    if (!$.alert) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.type = "text/css";
        const cssPromise = new Promise((resolve) => css.addEventListener("load", resolve));
        css.href = "/plugins/jquery-confirm/dist/jquery-confirm.min.css";
        document.head.appendChild(css);

        const tag = document.createElement("script");
        const scriptPromise = new Promise((resolve) => tag.addEventListener("load", resolve));
        tag.src = "/plugins/jquery-confirm/dist/jquery-confirm.min.js";
        document.head.appendChild(tag);

        await Promise.all([
            cssPromise,
            scriptPromise,
        ])
    }

    const ICAL_ID = /** @type {const} */("ctdacalendar");
    const ICAL_PRODUCT = /** @type {const} */("CTDA Timetable Exporter");

    const TIMEZONE = /** @type {const} */("Asia/Ho_Chi_Minh");

    const DAYS_OF_THE_WEEK = /** @type {const} */(["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);

    /**
     * @lazy Matches any of <br>, <br /> and more for various purposes,
     *       such as splitting dates and lecturers.
     */
    const ANY_BR_TAG_REGEX = /<\s*br\s*\/?\s*>/gu;
    
    /**
     * A mapping of semester codes to its beginning and ending dates.
     * Source: https://www.ctda.hcmus.edu.vn/wp-content/uploads/2023/08/CTDA_Ke-hoach-nam-2023-2024.pdf
     * @todo Update next year
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
                    start: new Date("2024-01-29T00:00:00Z"),
                    end: new Date("2024-02-18T00:00:00Z"),
                },
                {
                    // Midterms
                    start: new Date("2024-03-04T00:00:00Z"),
                    end: new Date("2024-03-10T00:00:00Z"),
                }
            ]
        },
        "3/23-24": {
            theory: {
                start: new Date("2024-05-13T00:00:00Z"),
                end: new Date("2024-08-18T00:00:00Z"),
            },
            practice: {
                start: new Date("2024-05-20T00:00:00Z"),
                end: new Date("2024-08-18T00:00:00Z"),
            },
            breaks: [
                {
                    // Midterms + Admission 2024
                    start: new Date("2024-06-17T00:00:00Z"),
                    end: new Date("2024-07-14T00:00:00Z"),
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
     * Formats a date with the provided formatter in ISO8601, without
     * any dashes or colons. Example: `20231005T094203`
     * 
     * @param {Date} d 
     * @param {Intl.DateTimeFormat} formatter
     * @returns {string}
     */
    function formatIcalISO8601(d, formatter) {
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
     * @param {string} content 
     * @param {number} initialLineLength 
     */
    function wrapText(content, initialLineLength = 0) {
        const length = content.length;
        
        let processed = 75 - initialLineLength;
        let ret = content.substring(0, 75 - initialLineLength);

        while (processed < length) {
            const substr = content.substring(processed, processed + 75);
            ret += `\r\n ${substr}`;
            processed += 75;
        }

        return ret;
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

            const [_, dayOfWeek, startHour, endHour, location] = /** @type {[string, typeof DAYS_OF_THE_WEEK[number], string, string, string]} */(match);

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
     * Creates a copy of the provided date object, and add a number of
     * days into it. Returns the new date object, with the old one
     * unmodified.
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
            descriptionRow.push(`DESCRIPTION:${wrapText(description, 13)}`);
        }
        
        const rrules = [
            `RRULE:FREQ=WEEKLY;UNTIL=${formatIcalISO8601(endDate, UTC_TIMEZONE_FORMATTER)}`,
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
                        rrules.push(` :${formatIcalISO8601(currentDate, LOCAL_TIMEZONE_FORMATTER)}`);
                    } else {
                        rrules.push(` ,${formatIcalISO8601(currentDate, LOCAL_TIMEZONE_FORMATTER)}`);
                    }
                    excludeCount++;
                }
                currentDate = addDays(currentDate, 7);
            }
        }

        return [
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}@${ICAL_ID}`,
            `DTSTAMP:${formatIcalISO8601(new Date(), UTC_TIMEZONE_FORMATTER)}`,

            `SUMMARY:${wrapText(tr.name, 9)}`,
            ...descriptionRow,
            `LOCATION:${wrapText(tr.location, 10)}`,

            `DTSTART;TZID=${TIMEZONE}:${
                formatIcalISO8601(
                    dateOfIndex(tr.startHm, startMondayUTC, tr.weekday),
                    LOCAL_TIMEZONE_FORMATTER,
                )
            }`,
            `DTEND;TZID=${TIMEZONE}:${
                formatIcalISO8601(
                    dateOfIndex(tr.endHm, startMondayUTC, tr.weekday),
                    LOCAL_TIMEZONE_FORMATTER,
                )
            }`,
            
            ...rrules,

            "END:VEVENT",
        ]
    }

    /**
     * Given a HTML string, returns its text content.
     * 
     * @param {string} content 
     */
    function deleteHTMLTags(content) {
        const div = document.createElement("div");
        div.innerHTML = content;
        const result = div.textContent;
        div.remove();
        return result ?? "";
    }

    if (document.location.pathname !== "/sinh-vien/ket-qua-dkhp") {
        $.alert({
            type: "red",
            title: "Wrong location",
            content: "You are in the wrong place. To export your timetable, go to https://portal.ctdb.hcmus.edu.vn/sinh-vien/ket-qua-dkhp.",
            buttons: {
                ok: {
                    text: "Take me there",
                    btnClass: "btn-blue",
                    action: () => {
                        document.location = "/sinh-vien/ket-qua-dkhp";
                    }
                },
                cancel: {
                    text: "Cancel",
                }
            }
        });
        return;
    }

    const dkhpTable = document.querySelector(".ModCTDBSVKetQuaDKHPC");
    if (!dkhpTable) {
        $.alert({
            type: "red",
            title: "Could not find timetable",
            content: 'Cannot export timetable if it does not exist. If you think this is an error, please <a href="https://github.com/beerpiss/hcmus-ctda-calendar/issues">contact the developer</a>.',
            buttons: {
                ok: {
                    text: "OK",
                }
            }
        })
        return;
    }

    /**
     * @type {DKHPViewModel}
     */
    const vmDKHP = ko.dataFor(dkhpTable);
    const ketQuaDKHP = vmDKHP.dsKetQuaDKHP();
    console.log(`ketQuaDKHP: ${JSON.stringify(ketQuaDKHP)}`);

    if (ketQuaDKHP.length === 0) {
        $.alert({
            title: "Nothing to export",
            content: 'Seems like you have no subjects this semester. Have fun! If you think this is an error, please <a href="https://github.com/beerpiss/hcmus-ctda-calendar/issues">contact the developer</a>.',
            buttons: {
                ok: {
                    text: "OK",
                }
            }
        });
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
            $.alert({
                type: "red",
                title: "Error",
                content: `Start and end dates for semester ${subject.HocKy} has not been added. Please <a href="https://github.com/beerpiss/hcmus-ctda-calendar/issues">contact the developer</a>.`,
                buttons: {
                    ok: {
                        text: "OK",
                    }
                }
            });
            return;
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
    toastr.success("The timetable was successfully exported.");
})();
