interface SemesterDates {
    theoryStart: Date;
    practiceStart: Date;
    theoryEnd: Date;
    practiceEnd: Date;
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

// Types from the website
declare const ko;

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
    dsKetQuaDKHP(items: Array<Subject>): unknown;
    dsHocKy(): Array<Semester>;
    dsHocKy(items: Array<Semester>): unknown;
    selectedMaHK(): number;
    selectedMaHK(code: number): unknown;
}
