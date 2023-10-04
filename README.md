## ctda-calendar

Inspired by [BKalendar](https://bkalendar.github.io)

Exports your timetable from the [HCMUS CTDA Portal](https://portal.ctdb.hcmus.edu.vn)
to the iCalendar format, for importing into popular calendar apps like 
[Google Calendar](https://support.google.com/calendar/answer/37118)
or [Outlook](https://support.microsoft.com/en-us/office/import-calendars-into-outlook-8e8364e1-400e-4c0f-a573-fe76b5a2d379).

### Usage
Paste the [contents of script.js](https://raw.githubusercontent.com/beerpiss/hcmus-ctda-calendar/trunk/script.js)
into the browser's DevTools console. The exported iCalendar file will be in your downloads folder.

For convenience, you can also save [this bookmarklet](javascript:void(function(d){if(d.location.host==='portal.ctdb.hcmus.edu.vn'&&d.location.pathname==='/sinh-vien/ket-qua-dkhp')document.body.appendChild(document.createElement('script')).src='https://beerpiss.github.io/hcmus-ctda-calendar/script.js?t='+Math.floor(Date.now()/60000)})(document);) 
(view from <https://beerpiss.github.io/hcmus-ctda-calendar/>) and execute it every time
you want to export the timetable.
