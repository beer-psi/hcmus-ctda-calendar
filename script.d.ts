interface TimeSpan {
    start: Date;
    end: Date;
}

interface SemesterDates {
    theory: TimeSpan;
    practice: TimeSpan;
    breaks: Array<TimeSpan>;
}

interface Timerow {
    name: string;
    /** Index of day of the week, starting from 0*/
    weekday: number;
    /** hh:mm in +07:00 timezone */
	startHm: [number, number];
	/** hh:mm in +07:00 timezone */
	endHm: [number, number];
	location: string;
    extras: Record<string, string>;
}

interface Subject {
    Id: string;
    MaDKHP: number;
    MaMG: number;
    MaMH: number;
    KyHieu: string;
    TenMH: string;
    TenTA: string;
    TenTP: string;
    SoTinChi: number;
    MaLopSH: string;
    MaLopHP: string;
    SoSVDK: number;
    SoSVDaDK: string;
    HocBangTA: boolean;
    MaHeDT: number
    LichHocLT: string;
    LichHocTH: string;
    MaNhomTH: number;
    GVLyThuyet: string
    GVThucHanh: string;
    GVTroGiang: string | null;
    MonHocLai: boolean;
    MonCaiThien: boolean;
    MonHoanThi: boolean;
    GhiChu: string;
    HocKy: string;
}

interface Semester {
    MaHK: number;
    NamHoc: string;
    TenHK: string;
    ThuTuHK: number;
}

interface DKHPViewModel {
    dsKetQuaDKHP(): Array<Subject>;
    dsKetQuaDKHP(items: Array<Subject>): KnockoutStatic;
    dsHocKy(): Array<Semester>;
    dsHocKy(items: Array<Semester>): KnockoutStatic;
    selectedMaHK(): number;
    selectedMaHK(code: number): KnockoutStatic;
}
