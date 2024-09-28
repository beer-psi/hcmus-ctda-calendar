/// <reference types="@types/knockout" />
/// <reference types="@types/toastr" />
/// <reference types="@types/jquery" />
/// <reference types="./jquery-confirm.d.ts" />

/**
 * An object containing a start date, and an end date.
 * 
 * @typedef {{
 *  start: Date;
 *  end: Date;
 * }} TimeSpan
 */

/** 
 * An object containing start and end dates for the semester, alongside
 * any mid-semester breaks.
 * 
 * Any breaks declared should be between the earliest start date, and the
 * latest end date.
 * 
 * @typedef {{
 *  theory: TimeSpan;
 *  practice: TimeSpan;
 *  breaks: Array<TimeSpan>;
 * }} SemesterDates
 */

/**
 * Object containing one single class time, alongside some metadata.
 * 
 * A subject can have many `Timerow`s.
 * 
 * @typedef {object} Timerow
 * @property {string} name The subject name of the class. Will be the
 *  event title when exporting to iCalendar.
 * @property {number} weekday Day of the week, from 0-6, with 0 being Monday.
 * @property {[number, number]} startHm Class start time in UTC+7
 * @property {[number, number]} endHm Class end time in UTC+7
 * @property {string | null} location Classroom location. Can be null for subjects
 *  like Physical Education.
 * @property {Record<string, string>} extras Any extra metadata that will
 *  be written into the event description, in the format of `${key}: ${value}`.
 */

/**
 * An object containing information about a Subject, as returned by the
 * portal's API and its Knockout.js view mmodel.
 * 
 * @typedef {{
 *  Id: string;
 *  MaDKHP: number;
 *  MaMG: number;
 *  MaMH: number;
 *  KyHieu: string;
 *  TenMH: string;
 *  TenTA: string;
 *  TenTP: string;
 *  SoTinChi: number;
 *  MaLopSH: string;
 *  MaLopHP: string;
 *  SoSVDK: number;
 *  SoSVDaDK: string;
 *  HocBangTA: boolean;
 *  MaHeDT: number
 *  LichHocLT: string;
 *  LichHocTH: string;
 *  MaNhomTH: number;
 *  GVLyThuyet: string
 *  GVThucHanh: string;
 *  GVTroGiang: string | null;
 *  MonHocLai: boolean;
 *  MonCaiThien: boolean;
 *  MonHoanThi: boolean;
 *  GhiChu: string;
 *  HocKy: string;
 * }} Subject
 */

/**
 * An object modelling a Semester, as returned by the portal's API and
 * the Knockout.js view model.
 * 
 * @typedef {{
 *  MaHK: number;
 *  NamHoc: string;
 *  TenHK: string;
 *  ThuTuHK: number;
 * }} Semester
 */

/**
 * The Knockout.js view model for the timetable page.
 * 
 * @typedef {{
 *  dsKetQuaDKHP: KnockoutObservableArray<Subject>;
 *  dsHocKy: KnockoutObservableArray<Semester>;
 *  selectedMaHK: KnockoutObservable<number>;
 * }} DKHPViewModel
 */

(async () => {
    "use strict";
    
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
     * Source: https://www.ctda.hcmus.edu.vn/wp-content/uploads/2024/08/CTDA_Ke-hoach-nam-2024-2025.pdf
     * @todo Update next year
     * @type {Record<string, SemesterDates>}
     */
    const SEMESTER_DATES = {
        "1/24-25": {
            theory: {
                start: new Date("2024-09-30T00:00:00Z"),
                end: new Date("2024-12-15T00:00:00Z"),
            },
            practice: {
                start: new Date("2024-10-07T00:00:00Z"),
                end: new Date("2024-12-15T00:00:00Z"),
            },
            breaks: [
                {
                    // Midterms
                    start: new Date("2024-11-04T00:00:00Z"),
                    end: new Date("2024-11-10T00:00:00Z"),
                }
            ]
        },
        "2/24-25": {
            theory: {
                start: new Date("2025-01-06T00:00:00Z"),
                end: new Date("2025-04-13T00:00:00Z"),
            },
            practice: {
                start: new Date("2025-01-13T00:00:00Z"),
                end: new Date("2025-04-13T00:00:00Z"),
            },
            breaks: [
                {
                    // Lunar New Year
                    start: new Date("2025-01-20T00:00:00Z"),
                    end: new Date("2025-02-09T00:00:00Z"),
                },
                {
                    // Midterms
                    start: new Date("2025-03-03T00:00:00Z"),
                    end: new Date("2025-03-09T00:00:00Z"),
                }
            ]
        },
        "3/24-25": {
            theory: {
                start: new Date("2025-05-12T00:00:00Z"),
                end: new Date("2025-08-17T00:00:00Z"),
            },
            practice: {
                start: new Date("2025-05-19T00:00:00Z"),
                end: new Date("2025-08-17T00:00:00Z"),
            },
            breaks: [
                {
                    // Midterms + Admission 2024
                    start: new Date("2025-06-16T00:00:00Z"),
                    end: new Date("2025-07-13T00:00:00Z"),
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
            const match = date.match(/(?<dow>T[2-7]|CN) (?<start>\d{1,2}:\d{1,2})-(?<end>\d{1,2}:\d{1,2}) (?:\((?<class>.+?)\))?/);

            if (!match || match.length !== 5) {
                throw new Error(`Schedule was not in correct format: ${date}`);
            }

            const [_, dayOfWeek, startHour, endHour, location] = /** @type {[string, typeof DAYS_OF_THE_WEEK[number], string, string, string | undefined]} */(match);
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
                location: location ?? null,
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
     * Taken from `@bkalendar/core`
     * 
     * Copyright (c) 2022 BKalendar
     * 
     * SPDX-License-Identifier: MIT
     * 
     * @param {Timerow} tr 
     * @param {Date} startMondayUTC
     * @param {Date} endDate
     * @param {Array<TimeSpan>} [excludes=[]]
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

        const vevent = [
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}@${ICAL_ID}`,
            `DTSTAMP:${formatIcalISO8601(new Date(), UTC_TIMEZONE_FORMATTER)}`,

            `SUMMARY:${wrapText(tr.name, 9)}`,
            ...descriptionRow,
        ];

        if (tr.location !== null) {
            vevent.push(`LOCATION:${wrapText(tr.location, 10)}`);
        }

        vevent.push(
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
        );

        return vevent;
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
		// http://www.tzurl.org/zoneinfo/Asia/Ho_Chi_Minh.ics
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
        if (!subject.LichHocLT && !subject.LichHocTH) {
            // Special case: Military Education does not have any times.
            continue;
        }

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
            /**
             * @type {Record<string, string>}
             */
            const extras = {};

            if (subject.GVLyThuyet) {
                extras["Giáo viên"] = subject.GVLyThuyet.replace(ANY_BR_TAG_REGEX, ", ");
            }

            Object.assign(extras, commonExtras);

            for (const schedule of parseSchedule(subject.LichHocLT)) {
                timerow = {
                    ...schedule,
                    name: calendarTitle,
                    extras,
                };
                ical.push(...formatTimerow(timerow, dates.theory.start, dates.theory.end, dates.breaks))
            }
        }

        if (subject.LichHocTH) {
            const calendarTitle = `[${subject.KyHieu}] [TH] ${subject.TenMH}`;
            /**
             * @type {Record<string, string>}
             */
            const extras = {};

            if (subject.GVThucHanh) {
                extras["Giáo viên"] = subject.GVThucHanh.replace(ANY_BR_TAG_REGEX, ", ");
            }

            Object.assign(extras, commonExtras);

            for (const schedule of parseSchedule(subject.LichHocTH)) {
                timerow = { 
                    ...schedule,
                    name: calendarTitle,
                    extras,
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
